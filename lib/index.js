import { Endpoint, EndpointTicket, RelayMode, SecretKey } from "@number0/iroh";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const DSH_WEAVE_ALPN = "dsh-weave/1";
export const DSH_WEAVE_PROTOCOL_VERSION = 1;
export const DSH_WEAVE_STAGE = "transport-mvp";
export const name = "dsh-weave";

const ALPN_BYTES = [...new TextEncoder().encode(DSH_WEAVE_ALPN)];
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_FRAME_BYTES = 64 * 1024;
const encode = (value) => [...encoder.encode(JSON.stringify(value))];
const decode = (bytes) => JSON.parse(decoder.decode(Uint8Array.from(bytes)));

export class DshWeaveTransport {
  constructor(ctx, config = {}) {
    this.ctx = ctx;
    this.config = config;
    this.identityPath = config.identityPath ?? join(homedir(), ".dsh", "dsh-weave", "identity.json");
    this.endpoint = undefined;
    this.starting = undefined;
    this.trustedPeers = new Set(config.trustedPeers ?? []);
    this.listeners = new Set();
  }
  async start() {
    if (this.endpoint) return this.endpoint;
    if (!this.starting) this.starting = this.#start();
    return this.starting;
  }
  async #start() {
    const builder = Endpoint.builder();
    builder.applyN0(); builder.alpns([ALPN_BYTES]);
    if (this.config.relayMode === "disabled") builder.relayMode(RelayMode.disabled());
    builder.secretKey(await this.#secretKey());
    this.endpoint = await builder.bind(); void this.#acceptLoop(); return this.endpoint;
  }
  async #secretKey() {
    if (Array.isArray(this.config.secretKey) && this.config.secretKey.length === 32) return this.config.secretKey;
    if (this.config.persistIdentity === false) return SecretKey.generate().toBytes();
    try {
      const saved = JSON.parse(await readFile(this.identityPath, "utf8"));
      if (Array.isArray(saved?.secretKey) && saved.secretKey.length === 32 && saved.secretKey.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) return saved.secretKey;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const secretKey = SecretKey.generate().toBytes();
    await mkdir(dirname(this.identityPath), { recursive: true });
    const temporary = `${this.identityPath}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify({ version: 1, secretKey })}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, this.identityPath); await chmod(this.identityPath, 0o600);
    return secretKey;
  }
  async close() { const endpoint = this.endpoint; this.endpoint = undefined; this.starting = undefined; if (endpoint) await endpoint.close(); }
  async ticket() { return EndpointTicket.fromAddr((await this.start()).addr()).toString(); }
  trust(ticket) { const id = EndpointTicket.fromString(ticket).endpointAddr().id().toString(); this.trustedPeers.add(id); return id; }
  peers() { return [...this.trustedPeers].sort(); }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  async send({ ticket, from, to, text, id = crypto.randomUUID() }) {
    if (typeof text !== "string" || text.trim() === "") throw new Error("dsh-weave text must not be empty");
    const endpoint = await this.start(); const address = EndpointTicket.fromString(ticket).endpointAddr(); const peerId = address.id().toString();
    if (!this.trustedPeers.has(peerId)) throw new Error(`peer ${peerId} is not trusted; call trust(ticket) first`);
    const connection = await endpoint.connect(address, ALPN_BYTES);
    try {
      const stream = await connection.openBi();
      await stream.send.writeAll(encode({ kind: "dsh-weave/message", version: 1, id, from, to, text })); await stream.send.finish();
      const acknowledgement = decode(await stream.recv.readToEnd(4096));
      if (acknowledgement?.ok !== true || acknowledgement.id !== id) throw new Error(acknowledgement?.error ?? "peer rejected message");
      return { id, peerId, delivered: true };
    } finally { connection.close(0n, []); }
  }
  async #acceptLoop() {
    const endpoint = this.endpoint; if (!endpoint) return;
    try { while (!endpoint.isClosed()) { const incoming = await endpoint.acceptNext(); if (!incoming) return; void this.#accept(incoming); } }
    catch (error) { if (!endpoint.isClosed()) console.warn("dsh-weave accept loop stopped", error); }
  }
  async #accept(incoming) {
    let connection;
    try {
      connection = await (await incoming.accept()).connect(); const peerId = connection.remoteId().toString(); const stream = await connection.acceptBi();
      if (!this.trustedPeers.has(peerId)) throw new Error(`peer ${peerId} is not trusted`);
      const message = decode(await stream.recv.readToEnd(MAX_FRAME_BYTES));
      if (message?.kind !== "dsh-weave/message" || message.version !== 1 || ![message.id, message.from, message.to, message.text].every((value) => typeof value === "string" && value)) throw new Error("invalid dsh-weave frame");
      const received = Object.freeze({ ...message, peerId, receivedAt: Date.now() }); const bridge = this.ctx?.get?.("dshBridge");
      if (bridge) bridge.deliverExternal(`weave:${peerId}:${message.from}`, message.to, message.text, { id: message.id, transport: "weave" });
      for (const listener of this.listeners) listener(received);
      await stream.send.writeAll(encode({ ok: true, id: message.id })); await stream.send.finish();
    } catch (error) { console.warn("dsh-weave rejected incoming frame", error); }
    finally { connection?.close(0n, []); }
  }
}

export function apply(ctx, config) {
  const weave = new DshWeaveTransport(ctx, config);
  ctx.accessor("dshWeave", { get: () => weave });
  ctx.on("dispose", () => void weave.close());
}
