# DSH Mesh architecture

## Goal

DSH Mesh connects trusted DeepSeek Harness nodes across hosts while preserving a local-first execution model. It is not a shared shell, a credential synchronizer, or an unauthenticated agent swarm.

## Layers

```text
DSH plugin surface
  └─ dsh-bridge: local event and task adapter
       └─ dsh-mesh core: membership, policy, outbox, routing
            └─ Iroh adapter: Endpoint, discovery, QUIC streams, relay fallback
```

Iroh is responsible for encrypted connectivity and endpoint authentication. Mesh is responsible for application membership and authorization. The two identities are deliberately separate: an Iroh endpoint key proves a peer is the same peer; a Mesh membership record determines what that peer may request.

## Node identity and membership

Each node stores a long-lived Iroh key and a Mesh node record:

```ts
type MeshNode = {
  nodeId: string;
  endpointId: string;
  displayName: string;
  publicKey: string;
  roles: ("operator" | "worker" | "observer")[];
  capabilities: string[];
  joinedAt: string;
  revokedAt?: string;
};
```

An invite contains a mesh identifier, intended roles, a short expiry, and a signature from an existing operator. The joining node must show the invite locally and require an approval action before storing membership.

## Data flow

1. A user approves a task handoff from DSH node A.
2. `dsh-bridge` emits a normalized task request to mesh core.
3. Mesh core persists the request to an outbox and opens an Iroh bidirectional stream using `dsh-mesh/1`.
4. Node B validates membership and the requested capability, then asks its local DSH policy for approval.
5. Node B sends an acknowledgement, emits progress events, and finally returns a result reference.
6. Node A de-duplicates events by message id and records the terminal outcome.

## Operational choices

- Use Iroh's standard discovery and relay services for local development.
- Use a dedicated relay map and controlled discovery service for production meshes.
- Keep an encrypted local outbox; do not rely on relay delivery as durable storage.
- Treat a missing heartbeat as a reachability signal, never as proof that a task failed.
