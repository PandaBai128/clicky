export class MiniMaxSSEAudioDecoder {
  #textDecoder = new TextDecoder();
  #pendingText = "";
  #hasStreamedAudio = false;

  consume(chunk, isFinalChunk = false) {
    this.#pendingText += this.#textDecoder.decode(chunk, { stream: !isFinalChunk });
    const lines = this.#pendingText.split("\n");
    this.#pendingText = isFinalChunk ? "" : lines.pop() || "";
    return lines.flatMap((line) => this.#decodeLine(line));
  }

  finish() {
    return this.consume(new Uint8Array(), true);
  }

  #decodeLine(line) {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith("data:")) {
      return [];
    }

    const payload = JSON.parse(trimmedLine.slice(5));
    if (payload.base_resp?.status_code && payload.base_resp.status_code !== 0) {
      throw new Error(payload.base_resp.status_msg || "MiniMax streaming TTS failed.");
    }

    const audioHex = payload.data?.audio?.trim();
    if (!audioHex) {
      return [];
    }

    if (payload.data?.status === 1) {
      this.#hasStreamedAudio = true;
      return [decodeHexAudio(audioHex)];
    }

    return this.#hasStreamedAudio ? [] : [decodeHexAudio(audioHex)];
  }
}

function decodeHexAudio(hexAudio) {
  if (hexAudio.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hexAudio)) {
    throw new Error("MiniMax returned invalid hexadecimal audio data.");
  }
  return Buffer.from(hexAudio, "hex");
}
