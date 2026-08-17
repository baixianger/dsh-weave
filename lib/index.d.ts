/** The application-layer protocol negotiated by dsh-weave peers. */
export declare const DSH_WEAVE_ALPN: "dsh-weave/1";

export declare const DSH_WEAVE_STAGE: "transport-mvp";

/** The first public protocol revision. */
export declare const DSH_WEAVE_PROTOCOL_VERSION: 1;
export declare const name = "dsh-weave";
export declare const inject: readonly ["tools"];
export interface DshWeaveMessage { readonly id: string; readonly from: string; readonly to: string; readonly text: string; readonly peerId: string; readonly receivedAt: number; }
export interface DshWeaveConfig { trustedPeers?: readonly string[]; secretKey?: readonly number[]; identityPath?: string; peersPath?: string; persistIdentity?: boolean; persistPeers?: boolean; relayMode?: "default" | "disabled"; }
export declare class DshWeaveTransport {
  constructor(ctx: unknown, config?: DshWeaveConfig);
  start(): Promise<unknown>; close(): Promise<void>; ticket(): Promise<string>; trust(ticket: string): Promise<string>; peers(): string[];
  subscribe(listener: (message: DshWeaveMessage) => void): () => void;
  send(request: { ticket: string; from: string; to: string; text: string; id?: string }): Promise<{ id: string; peerId: string; delivered: true }>;
}
export declare function apply(ctx: unknown, config?: DshWeaveConfig): void;
