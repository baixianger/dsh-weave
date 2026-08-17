# DSH Mesh

> A private, peer-to-peer fabric for connecting DeepSeek Harness nodes across machines.

**DSH Mesh** turns a collection of local DSH installations into an intentional network: nodes can discover trusted peers, exchange session-aware events, hand off work, and recover after a connection drops — without placing a central server in the execution path.

| Status | Transport | Scope |
| --- | --- | --- |
| `0.1.0-rc.0` design preview | Iroh + QUIC | Trusted DSH nodes |

## Why Mesh?

`dsh-bridge` is the local contract: it normalizes events between DSH, a CLI, and other local runtimes. `dsh-mesh` carries that same contract across machines.

```text
DSH node A ── dsh-bridge ── dsh-mesh ── Iroh ── Iroh ── dsh-mesh ── dsh-bridge ── DSH node B
```

Iroh supplies authenticated, encrypted QUIC connections, direct peer-to-peer paths where possible, and relay fallback where required. Mesh owns the parts specific to DSH: membership, capabilities, task approval, event ordering, and durable delivery.

## Install

This first release publishes the public protocol contract and architecture documents. The executable transport is not included yet.

```bash
npm install @baixianger/dsh-mesh@next
```

```js
import {
  DSH_MESH_ALPN,
  DSH_MESH_PROTOCOL_VERSION,
  DSH_MESH_STAGE,
} from "@baixianger/dsh-mesh";

console.log(DSH_MESH_ALPN);             // dsh-mesh/1
console.log(DSH_MESH_PROTOCOL_VERSION); // 1
console.log(DSH_MESH_STAGE);            // design-preview
```

## The first protocol

| Plane | What it carries | Delivery rule |
| --- | --- | --- |
| Control | invite, membership, heartbeat, capability updates | request/acknowledgement |
| Task | offer, accept, progress, result, cancellation | idempotent at-least-once |
| Session | user-approved context or trajectory references | explicit sharing only |

Every node has a persistent network identity. Joining a mesh requires an expiring invite and an explicit local approval. A transport connection alone never grants permission to execute a task.

## Security posture

- End-to-end encryption is supplied by Iroh's authenticated QUIC transport.
- A mesh allowlist and capability grants sit above transport identity.
- Remote work is denied by default until the receiving node approves it.
- Secrets, provider credentials, and raw filesystem access never travel as ordinary session events.
- A self-hosted relay/discovery deployment is the production path; public relays are for development only.

See [architecture](./docs/ARCHITECTURE.md), [wire protocol](./docs/PROTOCOL.md), and [security model](./docs/SECURITY.md).

## Roadmap

- [x] Publish the v1 protocol contract
- [ ] `dsh-bridge` local event adapter
- [ ] Iroh endpoint adapter and pair-by-invite flow
- [ ] Remote task request / approval / result streams
- [ ] Durable outbox and reconnect replay
- [ ] Self-hosted relay and discovery guidance

## Development

```bash
npm run check
```

## License

MIT © Xiang Bai
