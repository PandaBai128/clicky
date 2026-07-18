import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  MiniMaxSSEAudioDecoder as LocalMiniMaxSSEAudioDecoder,
} from "../minimax-sse-audio.mjs";
import {
  MiniMaxSSEAudioDecoder as WorkerMiniMaxSSEAudioDecoder,
  miniMaxSSEAudioStream,
} from "../src/minimax-sse-audio.ts";
import { miniMaxTTSModelSupportsEmotion } from "../src/minimax-tts-capabilities.ts";

const encoder = new TextEncoder();

for (const [name, Decoder] of [
  ["local proxy", LocalMiniMaxSSEAudioDecoder],
  ["Cloudflare Worker", WorkerMiniMaxSSEAudioDecoder],
]) {
  describe(`${name} MiniMax SSE decoder`, () => {
    test("preserves JSON split across network chunks", () => {
      const decoder = new Decoder();
      const firstChunks = decoder.consume(encoder.encode('data: {"data":{"audio":"6'));
      const secondChunks = decoder.consume(encoder.encode('162","status":1}}\n'));

      assert.deepEqual(firstChunks, []);
      assert.deepEqual([...secondChunks[0]], [0x61, 0x62]);
    });

    test("decodes the final SSE line without a newline", () => {
      const decoder = new Decoder();
      decoder.consume(encoder.encode('data: {"data":{"audio":"63","status":2}}'));

      const chunks = decoder.finish();
      assert.deepEqual([...chunks[0]], [0x63]);
    });

    test("does not repeat status-2 audio after status-1 chunks", () => {
      const decoder = new Decoder();
      const chunks = decoder.consume(encoder.encode(
        'data: {"data":{"audio":"61","status":1}}\n' +
          'data: {"data":{"audio":"6162","status":2}}\n',
      ));

      assert.equal(chunks.length, 1);
      assert.deepEqual([...chunks[0]], [0x61]);
    });

    test("surfaces MiniMax base response errors", () => {
      const decoder = new Decoder();
      assert.throws(
        () => decoder.consume(encoder.encode(
          'data: {"base_resp":{"status_code":1001,"status_msg":"quota exceeded"}}\n',
        )),
        /quota exceeded/,
      );
    });

    test("ignores events with no audio", () => {
      const decoder = new Decoder();
      const chunks = decoder.consume(encoder.encode(
        'data: {"data":{"audio":"","status":1}}\n' +
          'data: {"data":{"status":2}}\n',
      ));

      assert.deepEqual(chunks, []);
    });
  });
}

test("Cloudflare output cancellation propagates to the upstream reader", async () => {
  let upstreamWasCancelled = false;
  const upstreamBody = new ReadableStream({
    pull() {},
    cancel() {
      upstreamWasCancelled = true;
    },
  });
  const outputReader = miniMaxSSEAudioStream(upstreamBody).getReader();

  await outputReader.cancel();

  assert.equal(upstreamWasCancelled, true);
});

test("Cloudflare Worker gates emotion by MiniMax model capability", () => {
  assert.equal(miniMaxTTSModelSupportsEmotion("speech-2.8-turbo"), false);
  assert.equal(miniMaxTTSModelSupportsEmotion("speech-2.6-hd"), true);
  assert.equal(miniMaxTTSModelSupportsEmotion("speech-01-turbo"), true);
});
