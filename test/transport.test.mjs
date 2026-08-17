import assert from "node:assert/strict";
import test from "node:test";
import { DshWeaveTransport } from "../lib/index.js";

test("trusted Iroh peers exchange a DSH Weave message", async () => {
  const sender = new DshWeaveTransport(undefined, { relayMode: "disabled" });
  const receiver = new DshWeaveTransport(undefined, { relayMode: "disabled" });
  try {
    const senderTicket = await sender.ticket(); const receiverTicket = await receiver.ticket();
    sender.trust(receiverTicket); receiver.trust(senderTicket);
    const delivered = new Promise((resolve) => receiver.subscribe(resolve));
    assert.equal((await sender.send({ ticket: receiverTicket, from: "source", to: "target", text: "hello from Iroh" })).delivered, true);
    const received = await delivered;
    assert.equal(received.from, "source"); assert.equal(received.to, "target"); assert.equal(received.text, "hello from Iroh");
  } finally { await Promise.all([sender.close(), receiver.close()]); }
});
