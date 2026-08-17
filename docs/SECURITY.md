# DSH Mesh security model

## Trust boundaries

1. Iroh transport authentication proves possession of an endpoint key.
2. Mesh membership binds that endpoint to a named, approved node.
3. Capability grants constrain the actions a member may request.
4. Local DSH policy makes the final execution decision.

No layer can bypass the next one.

## Defaults

- Unknown endpoint: reject.
- Known endpoint without Mesh membership: reject.
- Known member without requested capability: reject.
- Authorized task with no local approval rule: ask the local operator.
- Network loss: retain the outbox; do not guess task success.

## Secrets and privacy

Credentials remain local to their DSH installation. Session sharing is opt-in and should use redacted, bounded context objects. Operators who need control over metadata exposure should run dedicated Iroh relay and discovery infrastructure.

## Review triggers

Revisit this model before adding unattended execution, third-party node invitations, shared file transfer, or a central management service.
