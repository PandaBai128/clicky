export function miniMaxTTSModelSupportsEmotion(model: string): boolean {
  return /^speech-(?:01|02|2\.6)-(?:hd|turbo)$/.test(model.trim().toLowerCase());
}
