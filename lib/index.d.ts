/** The application-layer protocol negotiated by dsh-weave peers. */
export declare const DSH_WEAVE_ALPN: "dsh-weave/1";

export declare const DSH_WEAVE_STAGE: "transport-mvp";

/** The first public protocol revision. */
export declare const DSH_WEAVE_PROTOCOL_VERSION: 1;
export declare const name = "dsh-weave";
export declare const inject: readonly ["connection", "tools", "sessions", "sessionTitle", "sessionPersistence", "workspaceRegistry"];
export interface DshWeaveMessage { readonly id: string; readonly from: string; readonly to: string; readonly text: string; readonly peerId: string; readonly receivedAt: number; }
export interface DshWeaveConfig { trustedPeers?: readonly string[]; secretKey?: readonly number[]; identityPath?: string; peersPath?: string; persistIdentity?: boolean; persistPeers?: boolean; relayMode?: "default" | "disabled"; hostName?: string; }
export declare class DshWeaveTransport {
  constructor(ctx: unknown, config?: DshWeaveConfig);
  start(): Promise<unknown>; close(): Promise<void>; ticket(): Promise<string>; trust(ticket: string): Promise<string>; identify(ticket: string): string; peers(): string[]; endpoints(): Array<{ peerId: string; ticket: string }>; hosts(): Array<{ hostId: string; addressKnown: boolean }>;
  subscribe(listener: (message: DshWeaveMessage) => void): () => void;
  send(request: { ticket: string; from: string; to: string; text: string; id?: string }): Promise<{ id: string; peerId: string; delivered: true; result?: unknown }>;
  sendTo(request: { hostId: string; from: string; to: string; text: string; id?: string }): Promise<{ id: string; peerId: string; delivered: true; result?: unknown }>;
  sessionCatalog(): Promise<{ hostName: string; workspaces: Array<{ id: string; title: string; sessions: Array<{ id: string; title: string; running: boolean; updatedAt: number }> }> }>;
  remoteSessions(timeoutMs?: number): Promise<Array<{ hostId: string; hostName: string; workspaces: Array<{ id: string; title: string; sessions: Array<{ id: string; title: string; running: boolean; updatedAt: number }> }> }>>;
}
export declare function apply(ctx: unknown, config?: DshWeaveConfig): void;
