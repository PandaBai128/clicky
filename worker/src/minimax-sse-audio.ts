export class MiniMaxSSEAudioDecoder {
  private readonly textDecoder = new TextDecoder();
  private pendingText = "";
  private hasStreamedAudio = false;

  consume(chunk: Uint8Array, isFinalChunk = false): Uint8Array[] {
    this.pendingText += this.textDecoder.decode(chunk, { stream: !isFinalChunk });
    const lines = this.pendingText.split("\n");
    this.pendingText = isFinalChunk ? "" : lines.pop() || "";
    return lines.flatMap((line) => this.decodeLine(line));
  }

  finish(): Uint8Array[] {
    return this.consume(new Uint8Array(), true);
  }

  private decodeLine(line: string): Uint8Array[] {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith("data:")) {
      return [];
    }

    const payload = JSON.parse(trimmedLine.slice(5)) as {
      data?: { audio?: string; status?: number };
      base_resp?: { status_code?: number; status_msg?: string };
    };
    if (payload.base_resp?.status_code && payload.base_resp.status_code !== 0) {
      throw new Error(payload.base_resp.status_msg || "MiniMax streaming TTS failed.");
    }

    const audioHex = payload.data?.audio?.trim();
    if (!audioHex) {
      return [];
    }

    if (payload.data?.status === 1) {
      this.hasStreamedAudio = true;
      return [hexToUint8Array(audioHex)];
    }

    // Status 2 repeats the complete file after status-1 chunks.
    return this.hasStreamedAudio ? [] : [hexToUint8Array(audioHex)];
  }
}

export function miniMaxSSEAudioStream(
  upstreamBody: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const reader = upstreamBody.getReader();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const decoder = new MiniMaxSSEAudioDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          const audioChunks = done ? decoder.finish() : decoder.consume(value);
          for (const audioChunk of audioChunks) {
            controller.enqueue(audioChunk);
          }
          if (done) {
            break;
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
    cancel() {
      return reader.cancel();
    },
  });
}

function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error("MiniMax returned invalid hexadecimal audio data.");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
