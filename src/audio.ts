export type Voice = 'kick' | 'snare' | 'hat' | 'bass' | 'lead';
export type Track = { voice: Voice; steps: boolean[]; muted: boolean; volume: number };
export type Song = { name: string; bpm: number; key: 'A minor' | 'C major' | 'D minor'; tracks: Track[] };
type SynthContext = AudioContext | OfflineAudioContext;
export const voices: Voice[] = ['kick', 'snare', 'hat', 'bass', 'lead'];
export function isSong(value: unknown): value is Song {
  const song = value as Song;
  return !!song && typeof song.name === 'string' && song.name.length <= 100 && Number.isFinite(song.bpm) && song.bpm >= 50 && song.bpm <= 180 && ['A minor', 'C major', 'D minor'].includes(song.key) && Array.isArray(song.tracks) && song.tracks.length === 5 && song.tracks.every((track, index) => track.voice === voices[index] && typeof track.muted === 'boolean' && Number.isFinite(track.volume) && track.volume >= 0 && track.volume <= 1 && Array.isArray(track.steps) && track.steps.length === 16 && track.steps.every(step => typeof step === 'boolean'));
}
export function preset(name: 'Midnight commit' | 'Slow Sunday' | 'Boss room'): Song {
  const patterns = name === 'Slow Sunday' ? [[0, 7, 10], [4, 12], [2, 6, 10, 14], [0, 6, 10, 14], [3, 7, 11, 15]] : name === 'Boss room' ? [[0, 4, 8, 10, 12], [4, 12], [0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 6, 7, 8, 11, 14, 15]] : [[0, 6, 8, 14], [4, 12], [0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 6, 8, 11, 14], [2, 5, 7, 10, 13, 15]];
  return { name, bpm: name === 'Slow Sunday' ? 78 : name === 'Boss room' ? 140 : 104, key: 'A minor', tracks: voices.map((voice, index) => ({ voice, steps: Array.from({ length: 16 }, (_, step) => patterns[index].includes(step)), muted: false, volume: [0.8, 0.55, 0.3, 0.48, 0.28][index] })) };
}
export function makeOutput(context: SynthContext) {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -16; compressor.knee.value = 18; compressor.ratio.value = 5;
  const master = context.createGain(); master.gain.value = 0.52;
  compressor.connect(master); master.connect(context.destination);
  return compressor;
}
const noiseCache = new WeakMap<SynthContext, AudioBuffer>();
function noise(context: SynthContext) {
  const existing = noiseCache.get(context); if (existing) return existing;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.25), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
  noiseCache.set(context, buffer); return buffer;
}
export function hit(context: SynthContext, output: AudioNode, track: Track, time: number, step: number, key: Song['key']) {
  if (track.muted || !track.steps[step]) return;
  const amplitude = context.createGain();
  amplitude.gain.setValueAtTime(0.0001, time);
  amplitude.gain.exponentialRampToValueAtTime(Math.max(0.0001, track.volume * 0.65), time + 0.006);
  amplitude.connect(output);
  if (track.voice === 'hat' || track.voice === 'snare') {
    const source = context.createBufferSource(); source.buffer = noise(context);
    const filter = context.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = track.voice === 'hat' ? 7000 : 1500;
    const length = track.voice === 'hat' ? 0.07 : 0.17;
    amplitude.gain.exponentialRampToValueAtTime(0.0001, time + length);
    source.connect(filter); filter.connect(amplitude); source.start(time); source.stop(time + length + 0.01);
    source.onended = () => { source.disconnect(); filter.disconnect(); amplitude.disconnect(); };
  } else {
    const oscillator = context.createOscillator();
    oscillator.type = track.voice === 'kick' ? 'sine' : track.voice === 'bass' ? 'triangle' : 'sine';
    let length = 0.25;
    if (track.voice === 'kick') { oscillator.frequency.setValueAtTime(145, time); oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.13); }
    else {
      const scale = key === 'C major' ? [0, 4, 7, 11, 12, 7, 4, 2] : [0, 3, 7, 10, 12, 7, 5, 3];
      const rootNote = key === 'A minor' ? 45 : key === 'C major' ? 48 : 50;
      const note = rootNote + (track.voice === 'lead' ? 24 + scale[step % scale.length] : [0, 0, 3, 3, 5, 5, 7, 7][Math.floor(step / 2)]);
      oscillator.frequency.setValueAtTime(440 * 2 ** ((note - 69) / 12), time);
      length = track.voice === 'bass' ? 0.28 : 0.42;
    }
    amplitude.gain.exponentialRampToValueAtTime(0.0001, time + length);
    oscillator.connect(amplitude); oscillator.start(time); oscillator.stop(time + length + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); amplitude.disconnect(); };
  }
}
export async function renderWave(song: Song) {
  const stepDuration = 60 / song.bpm / 4;
  const context = new OfflineAudioContext(2, Math.ceil((64 * stepDuration + 0.5) * 44100), 44100);
  const output = makeOutput(context);
  for (let step = 0; step < 64; step++) for (const track of song.tracks) hit(context, output, track, step * stepDuration, step % 16, song.key);
  const rendered = await context.startRendering();
  const buffer = new ArrayBuffer(44 + rendered.length * 4);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => { for (let index = 0; index < text.length; index++) view.setUint8(offset + index, text.charCodeAt(index)); };
  writeText(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); writeText(8, 'WAVE'); writeText(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true); view.setUint32(24, 44100, true); view.setUint32(28, 176400, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true); writeText(36, 'data'); view.setUint32(40, buffer.byteLength - 44, true);
  const left = rendered.getChannelData(0); const right = rendered.getChannelData(1);
  for (let index = 0; index < rendered.length; index++) { view.setInt16(44 + index * 4, Math.max(-1, Math.min(1, left[index])) * 32767, true); view.setInt16(46 + index * 4, Math.max(-1, Math.min(1, right[index])) * 32767, true); }
  return new Blob([buffer], { type: 'audio/wav' });
}
