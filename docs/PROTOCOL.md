# DSH Weave wire protocol v1

## Authoritative room extension

`dsh-chat/2` is carried in a normal Weave frame with target `dsh-chat/2`.
Its request/reply results implement `room.invite`, `room.read`, `room.post`,
and `room.delivery`. The room host validates the invitation capability for
reads and posts. Claimed control frames never enter DSH Bridge; only an
explicit `room.delivery` may wake an agent.

## Transport

- ALPN: `dsh-weave/1`
- Transport: Iroh endpoint over authenticated QUIC
- Encoding: length-prefixed UTF-8 JSON for the preview protocol
- Streams: one control stream and one stream per task request

## Envelope

```ts
type MeshEnvelope<T> = {
  version: 1;
  meshId: string;
  messageId: string;
  sentAt: string;
  sender: string;
  kind: string;
  payload: T;
};
```

`messageId` is globally unique for a node. Receivers persist recently processed ids and acknowledge duplicate messages without re-running their effects.

## Control messages

| Kind | Direction | Purpose |
| --- | --- | --- |
| `hello` | both | confirm node identity, protocol revision, and membership |
| `heartbeat` | both | report reachability and current capacity |
| `membership.revoke` | operator → member | revoke a node's mesh access |
| `capability.update` | operator → member | update approved remote capabilities |

## Task messages

| Kind | Required response |
| --- | --- |
| `task.offer` | `task.accept` or `task.reject` |
| `task.progress` | optional acknowledgement |
| `task.result` | terminal acknowledgement |
| `task.cancel` | `task.cancelled` or terminal result |

Task payloads carry a minimal, user-approved context reference. They never include provider credentials, a blanket filesystem token, or an implicit command-execution grant.

## Reliability

- Sender writes each non-terminal message to the outbox before sending.
- Receiver acknowledges after durable de-duplication, before expensive work begins.
- Sender retries with exponential backoff until acknowledgement or expiry.
- Task execution must be idempotent by `taskId`; a duplicate offer must return its existing state.
