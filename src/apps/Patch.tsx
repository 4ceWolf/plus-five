import { useEffect, useRef, useState } from 'react';
import { Play, Square, Download, Upload, Volume2, VolumeX, Shuffle, RotateCcw, Music2, AudioLines } from 'lucide-react';
import { PageHeading, useStore, download } from '../shared';
import { hit, makeOutput, preset, isSong, renderWave, type Song } from '../audio';

export default function PatchApp() {
  const [song, setSong] = useStore<Song>('song', preset('Midnight commit'), isSong);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(-1);
  const [notice, setNotice] = useState('');
  const [undo, setUndo] = useState<Song | null>(null);
  const songRef = useRef(song); songRef.current = song;
  const engine = useRef<{ context: AudioContext; interval: ReturnType<typeof setInterval>; frame: number } | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const startPending = useRef(false);
  function stop() {
    const current = engine.current;
    if (current) { clearInterval(current.interval); cancelAnimationFrame(current.frame); void current.context.close(); engine.current = null; }
    setPlaying(false); setStep(-1);
  }
  useEffect(() => {
    const onHidden = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', onHidden);
    return () => { document.removeEventListener('visibilitychange', onHidden); const current = engine.current; if (current) { clearInterval(current.interval); cancelAnimationFrame(current.frame); void current.context.close(); } };
  }, []);
  async function toggle() {
    if (engine.current) { stop(); return; }
    if (startPending.current) return;
    startPending.current = true;
    try {
      const context = new AudioContext(); await context.resume(); const output = makeOutput(context);
      let nextTime = context.currentTime + 0.06; let nextStep = 0;
      const scheduled: { time: number; step: number }[] = [];
      const scheduler = () => {
        while (nextTime < context.currentTime + 0.1) {
          const currentSong = songRef.current;
          for (const track of currentSong.tracks) hit(context, output, track, nextTime, nextStep, currentSong.key);
          scheduled.push({ time: nextTime, step: nextStep });
          nextTime += 60 / currentSong.bpm / 4; nextStep = (nextStep + 1) % 16;
        }
      };
      engine.current = { context, interval: setInterval(scheduler, 25), frame: 0 };
      const draw = () => {
        if (!engine.current) return;
        while (scheduled[0] && scheduled[0].time <= context.currentTime) setStep(scheduled.shift()!.step);
        engine.current.frame = requestAnimationFrame(draw);
      };
      scheduler(); draw(); setPlaying(true); setNotice('');
    } catch { setNotice('Could not start audio. Try a browser that supports Web Audio.'); }
    finally { startPending.current = false; }
  }
  function toggleStep(trackIndex: number, stepIndex: number) {
    setSong(current => ({ ...current, tracks: current.tracks.map((track, index) => index === trackIndex ? { ...track, steps: track.steps.map((active, position) => position === stepIndex ? !active : active) } : track) }));
  }
  function remix() {
    setUndo(song);
    setSong(current => ({ ...current, name: 'Happy accident', tracks: current.tracks.map(track => ({ ...track, steps: track.steps.map((_, index) => track.voice === 'kick' ? index % 4 === 0 || Math.random() < 0.12 : track.voice === 'snare' ? index === 4 || index === 12 : Math.random() < (track.voice === 'hat' ? 0.6 : 0.35)) })) }));
    setNotice('A new idea. Keep what you like, tap away what you don’t.');
  }
  async function exportWave() {
    setBusy(true);
    try { const blob = await renderWave(song); download(`${song.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'patch'}-4-bars.wav`, blob); setNotice('Exported four bars of your mix, including the release tail.'); }
    catch { setNotice('Audio export is not available in this browser. You can still save the project.'); }
    finally { setBusy(false); }
  }
  async function importProject(file: File | undefined) {
    if (!file) return;
    try { if (file.size > 100000) throw new Error(); const data: unknown = JSON.parse(await file.text()); if (!isSong(data)) throw new Error(); stop(); setUndo(song); setSong(data); setNotice('Project loaded.'); }
    catch { setNotice('That file is not a valid Patch project. Your current mix is unchanged.'); }
    if (upload.current) upload.current.value = '';
  }
  return <><PageHeading eyebrow="04 / PATCH" title="A good idea sounds like this." description="A tiny studio for your next loop, game soundtrack, or happy accident." action={<button className="button primary" disabled={busy} onClick={exportWave}><Download size={17} />{busy ? 'Rendering…' : 'Export WAV'}</button>} />
    <section className="studio"><header className="studio-top"><div className="project-title"><span className="sound-mark"><AudioLines size={23} /></span><label><span>PROJECT</span><input aria-label="Project name" maxLength={100} value={song.name} onChange={event => setSong({ ...song, name: event.target.value })} /></label></div><div className="studio-format"><span>16 STEPS</span><span>4 / 4</span><span>5 VOICES</span></div></header>
    <div className="transport-bar"><button className={`play-button ${playing ? 'playing' : ''}`} onClick={toggle} aria-label={playing ? 'Stop playback' : 'Play loop'}>{playing ? <Square size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}</button><label className="tempo-control"><span>TEMPO</span><strong>{song.bpm}<small>BPM</small></strong><input aria-label="Tempo" type="range" min="50" max="180" value={song.bpm} onChange={event => setSong({ ...song, bpm: Number(event.target.value) })} /></label><label className="key-control"><span>KEY</span><select value={song.key} onChange={event => setSong({ ...song, key: event.target.value as Song['key'] })}><option>A minor</option><option>C major</option><option>D minor</option></select></label><div className="beat-position"><span>POSITION</span><strong>{step < 0 ? '01' : String(Math.floor(step / 4) + 1).padStart(2, '0')}<small>.{step < 0 ? '1' : step % 4 + 1}</small></strong></div></div>
    <div className="sequencer"><div className="sequence-header"><span>INSTRUMENT</span><div className="step-numbers">{Array.from({ length: 16 }, (_, index) => <span key={index} className={step === index ? 'current' : ''}>{index % 4 === 0 ? `0${index / 4 + 1}` : '·'}</span>)}</div><span className="mix-heading">LEVEL</span></div>{song.tracks.map((track, trackIndex) => <div className={`sequence-row voice-${track.voice} ${track.muted ? 'muted-track' : ''}`} key={track.voice}><div className="instrument-name"><button className="icon-button" aria-label={`${track.muted ? 'Unmute' : 'Mute'} ${track.voice}`} aria-pressed={track.muted} onClick={() => setSong(current => ({ ...current, tracks: current.tracks.map((item, index) => index === trackIndex ? { ...item, muted: !item.muted } : item) }))}>{track.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button><span>{track.voice}<small>{['Low & warm', 'A little snap', 'Keep it moving', 'The foundation', 'The little hook'][trackIndex]}</small></span></div><div className="step-grid">{track.steps.map((active, position) => <button key={position} className={`step-pad ${active ? 'on' : ''} ${step === position ? 'playhead' : ''}`} aria-label={`${track.voice} step ${position + 1}`} aria-pressed={active} onClick={() => toggleStep(trackIndex, position)}><span>{active ? '•' : ''}</span></button>)}</div><input className="track-level" type="range" min="0" max="1" step="0.01" aria-label={`${track.voice} volume`} value={track.volume} onChange={event => setSong(current => ({ ...current, tracks: current.tracks.map((item, index) => index === trackIndex ? { ...item, volume: Number(event.target.value) } : item) }))} /></div>)}</div>
    <footer className="studio-bottom"><span><Music2 size={16} />Tap a step. Change the feeling.</span><div><button className="text-button" disabled={!undo} onClick={() => { if (undo) { setSong(undo); setUndo(null); } }}><RotateCcw size={15} />Undo remix</button><button className="text-button" onClick={remix}><Shuffle size={16} />Surprise me</button></div></footer></section>
    <div className="patch-lower"><section className="preset-panel"><div className="section-heading"><h2>A place to start</h2><span>PRESETS</span></div><div className="preset-list">{(['Midnight commit', 'Slow Sunday', 'Boss room'] as const).map((name, index) => <button className={`preset-card ${song.name === name ? 'selected' : ''}`} key={name} onClick={() => { setUndo(song); setSong(preset(name)); }}><div className={`preset-glyph glyph-${index}`} aria-hidden="true">{Array.from({ length: 8 }, (_, stepIndex) => <span key={stepIndex} style={{ height: `${[35, 72, 48, 90, 65, 40, 78, 52][(stepIndex + index * 2) % 8]}%` }} />)}</div><strong>{name}</strong><span>{['Late-night groove · 104 BPM', 'Easy does it · 78 BPM', 'One more life · 140 BPM'][index]}</span></button>)}</div></section><section className="panel project-files"><div className="section-label"><span>KEEP YOUR IDEAS</span><Download size={17} /></div><p>Everything is synthesized right here. Your loops stay on this device.</p><button className="button secondary" onClick={() => download('patch-project.json', JSON.stringify(song, null, 2))}><Download size={16} /> Save project</button><button className="text-button" onClick={() => upload.current?.click()}><Upload size={16} /> Open project</button><input ref={upload} type="file" accept=".json" hidden onChange={event => void importProject(event.target.files?.[0])} /></section></div><div className="status-line" role="status">{notice || 'Start at a comfortable volume. Playback pauses when this tab is hidden.'}</div>
  </>;
}
