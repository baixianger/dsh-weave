import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DshWeaveTransport } from "../lib/index.js";

test("trusted Iroh peers exchange a DSH Weave message", async () => {
  const sender = new DshWeaveTransport(undefined, { relayMode: "disabled", persistIdentity: false });
  const receiver = new DshWeaveTransport(undefined, { relayMode: "disabled", persistIdentity: false });
  try {
    const senderTicket = await sender.ticket(); const receiverTicket = await receiver.ticket();
    await sender.trust(receiverTicket); await receiver.trust(senderTicket);
    const delivered = new Promise((resolve) => receiver.subscribe(resolve));
    assert.equal((await sender.send({ ticket: receiverTicket, from: "source", to: "target", text: "hello from Iroh" })).delivered, true);
    const received = await delivered;
    assert.equal(received.from, "source"); assert.equal(received.to, "target"); assert.equal(received.text, "hello from Iroh");
  } finally { await Promise.all([sender.close(), receiver.close()]); }
});

test("a claimed Weave frame returns a protocol response without Bridge delivery", async () => {
  const bridgeCalls = [];
  const sender = new DshWeaveTransport(undefined, { relayMode: "disabled", persistIdentity: false });
  const receiver = new DshWeaveTransport({ dshBridge: { deliverExternal(...args) { bridgeCalls.push(args); } } }, { relayMode: "disabled", persistIdentity: false });
  try {
    const senderTicket = await sender.ticket(); const receiverTicket = await receiver.ticket();
    await sender.trust(receiverTicket); await receiver.trust(senderTicket);
    receiver.subscribe((frame) => frame.to === "room" ? { claimed: true, result: { cursor: 7, events: [frame.text] } } : false);
    const delivered = await sender.send({ ticket: receiverTicket, from: "client", to: "room", text: "read" });
    assert.deepEqual(delivered.result, { cursor: 7, events: ["read"] });
    assert.equal(bridgeCalls.length, 0);
  } finally { await Promise.all([sender.close(), receiver.close()]); }
});

test("Weave owns the reachable workspace session catalog and hides archived entries", async () => {
  const active = { id: "active-session", header: { id: "active-session", createdAt: 20 } };
  const archived = { id: "archived-session", header: { id: "archived-session", createdAt: 10 } };
  const receiver = new DshWeaveTransport({
    sessions: { list() { return [active]; } },
    sessionTitle: { get(session) { return { title: session.id === "active-session" ? "Active build" : session.id }; } },
    sessionPersistence: { async list() { return [active.header, archived.header]; } },
    workspaceRegistry: {
      archivedSessionIds: ["archived-session"],
      list() { return [
        { id: "workspace-live", title: "Release", sessionIds: ["active-session", "archived-session"] },
        { id: "workspace-archived", title: "Old", archived: true, sessionIds: ["active-session"] }
      ]; }
    }
  }, { relayMode: "disabled", persistIdentity: false, persistPeers: false, hostName: "studio-mini" });
  const sender = new DshWeaveTransport(undefined, { relayMode: "disabled", persistIdentity: false, persistPeers: false });
  try {
    const senderTicket = await sender.ticket(); const receiverTicket = await receiver.ticket();
    await sender.trust(receiverTicket); await receiver.trust(senderTicket);
    const catalogs = await sender.remoteSessions();
    assert.equal(catalogs.length, 1); assert.equal(catalogs[0].hostName, "studio-mini");
    assert.deepEqual(catalogs[0].workspaces, [{ id: "workspace-live", title: "Release", sessions: [{ id: "active-session", title: "Active build", running: true, updatedAt: 20 }] }]);
  } finally { await Promise.all([sender.close(), receiver.close()]); }
});

test("a default Weave identity survives a transport restart", async () => {
  const identityPath = join(await mkdtemp(join(tmpdir(), "dsh-weave-")), "identity.json");
  const first = new DshWeaveTransport(undefined, { relayMode: "disabled", identityPath });
  const firstTicket = await first.ticket(); await first.close();
  const second = new DshWeaveTransport(undefined, { relayMode: "disabled", identityPath });
  try {
    const firstId = (await import("@number0/iroh")).EndpointTicket.fromString(firstTicket).endpointAddr().id().toString();
    const secondId = (await import("@number0/iroh")).EndpointTicket.fromString(await second.ticket()).endpointAddr().id().toString();
    assert.equal(secondId, firstId);
    assert.equal((await stat(identityPath)).mode & 0o777, 0o600);
  } finally { await second.close(); }
});

test("trusted peer identities survive a transport restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dsh-weave-"));
  const peersPath = join(directory, "peers.json");
  const receiver = new DshWeaveTransport(undefined, { relayMode: "disabled", persistIdentity: false, persistPeers: false });
  const ticket = await receiver.ticket();
  const first = new DshWeaveTransport(undefined, { relayMode: "disabled", persistIdentity: false, peersPath });
  await first.trust(ticket); await first.close();
  const second = new DshWeaveTransport(undefined, { relayMode: "disabled", persistIdentity: false, peersPath });
  try {
    assert.equal(second.peers().length, 0); await second.start(); assert.equal(second.peers().length, 1);
    assert.equal(second.endpoints().length, 1); assert.equal(second.endpoints()[0].ticket, ticket);
  }
  finally { await Promise.all([receiver.close(), second.close()]); }
});
