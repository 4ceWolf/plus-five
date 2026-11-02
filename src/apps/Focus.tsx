import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, ArrowRight, Headphones, Volume2, VolumeX, Coffee, Clock3, Check } from 'lucide-react';
import { PageHeading, useStore, localDay, uid } from '../shared';

type Session = { id: string; day: string; minutes: number; intention: string; ended: number };
type TimerState = { id: string; phase: 'focus' | 'break'; duration: number; remaining: number; deadline: number | null; intention: string };
type FocusData = { minutes: number; breakMinutes: number; intention: string; timer: TimerState | null; sessions: Session[] };
const initial: FocusData = { minutes: 25, breakMinutes: 5, intention: '', timer: null, sessions: [] };
export function isFocus(value: unknown): value is FocusData {
  const data = value as FocusData;
  return !!data && Number.isFinite(data.minutes) && data.minutes >= 1 && data.minutes <= 120 && Number.isFinite(data.breakMinutes) && data.breakMinutes >= 1 && data.breakMinutes <= 30 && typeof data.intention === 'string' && Array.isArray(data.sessions) && data.sessions.every(session => typeof session.id === 'string' && typeof session.day === 'string' && Number.isFinite(session.minutes) && typeof session.intention === 'string' && Number.isFinite(session.ended)) && (data.timer === null || !!data.timer && typeof data.timer.id === 'string' && ['focus', 'break'].includes(data.timer.phase) && Number.isFinite(data.timer.duration) && data.timer.duration > 0 && Number.isFinite(data.timer.remaining) && data.timer.remaining >= 0 && (data.timer.deadline === null || Number.isFinite(data.timer.deadline)) && typeof data.timer.intention === 'string');
}

export default function FocusApp() {
  const [data, setData] = useStore<FocusData>('focus', initial, isFocus);
  const [now, setNow] = useState(Date.now());
  const [ambient, setAmbient] = useState(false);
  const [notice, setNotice] = useState('');
  const audioRef = useRef<AudioContext | null>(null);
  const noiseRef = useRef<AudioBufferSourceNode | null>(null);
  const timer = data.timer;
  const running = timer?.deadline != null;
  const phase = timer?.phase || 'focus';
  const duration = timer?.duration ?? data.minutes * 60;
  const remaining = Math.max(0, timer?.deadline ? Math.ceil((timer.deadline - now) / 1000) : timer?.remaining ?? duration);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const today = data.sessions.filter(session => session.day === localDay());
  const totalMinutes = today.reduce((sum, session) => sum + session.minutes, 0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [running]);
  useEffect(() => {
    if (!timer?.deadline || timer.deadline > now) return;
    setData(current => {
      if (current.timer?.id !== timer.id || current.timer.deadline === null) return current;
      const sessions = timer.phase === 'focus' && !current.sessions.some(session => session.id === timer.id) ? [...current.sessions, { id: timer.id, day: localDay(timer.deadline!), minutes: timer.duration / 60, intention: timer.intention || 'Focused work', ended: timer.deadline! }].slice(-2000) : current.sessions;
      const nextPhase = timer.phase === 'focus' ? 'break' : 'focus';
      const nextDuration = (nextPhase === 'break' ? current.breakMinutes : current.minutes) * 60;
      return { ...current, sessions, timer: { id: uid(), phase: nextPhase, duration: nextDuration, remaining: nextDuration, deadline: null, intention: current.intention } };
    });
    setNotice(timer.phase === 'focus' ? 'Session complete. Your break is ready when you are.' : 'Break complete. Ready for another good stretch?');
  }, [now, timer, setData]);
  useEffect(() => () => { noiseRef.current?.stop(); void audioRef.current?.close(); }, []);

  function toggle() {
    const time = Date.now();
    setNow(time);
    setNotice('');
    setData(current => {
      if (current.timer?.deadline) return { ...current, timer: { ...current.timer, remaining: Math.max(0, (current.timer.deadline - time) / 1000), deadline: null } };
      const currentTimer = current.timer || { id: uid(), phase: 'focus' as const, duration: current.minutes * 60, remaining: current.minutes * 60, intention: current.intention, deadline: null };
      return { ...current, timer: { ...currentTimer, deadline: time + currentTimer.remaining * 1000, intention: current.intention } };
    });
  }
  function choosePhase(nextPhase: 'focus' | 'break') {
    const nextDuration = (nextPhase === 'focus' ? data.minutes : data.breakMinutes) * 60;
    setData(current => ({ ...current, timer: { id: uid(), phase: nextPhase, duration: nextDuration, remaining: nextDuration, deadline: null, intention: current.intention } }));
  }
  function changeMinutes(target: 'focus' | 'break', value: number) {
    if (!Number.isInteger(value) || value < 1 || value > (target === 'focus' ? 120 : 30)) return;
    setData(current => ({ ...current, [target === 'focus' ? 'minutes' : 'breakMinutes']: value, timer: current.timer?.phase === target ? { ...current.timer, id: uid(), duration: value * 60, remaining: value * 60, deadline: null } : current.timer }));
  }
  async function toggleAmbient() {
    if (ambient) { noiseRef.current?.stop(); noiseRef.current = null; setAmbient(false); return; }
    try {
      const context = audioRef.current || new AudioContext();
      audioRef.current = context;
      await context.resume();
      const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
      const channel = buffer.getChannelData(0);
      let previous = 0;
      for (let index = 0; index < channel.length; index++) { previous = (previous + (Math.random() * 2 - 1) * 0.02) / 1.02; channel[index] = previous * 3.5; }
      const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
      const gain = context.createGain(); gain.gain.value = 0.14;
      source.connect(gain); gain.connect(context.destination); source.start();
      noiseRef.current = source; setAmbient(true);
    } catch { setNotice('Audio is unavailable in this browser. The timer still works.'); }
  }

  return <>
    <PageHeading eyebrow="02 / STILL" title="One thing. Your full attention." description="Set an intention, settle in, and let the rest wait." />
    <div className="focus-layout"><section className="focus-stage"><div className="focus-stage-top"><span className="tiny-label">A LITTLE SPACE TO THINK</span><div className="segmented"><button aria-pressed={phase === 'focus'} disabled={running} onClick={() => choosePhase('focus')}>Focus</button><button aria-pressed={phase === 'break'} disabled={running} onClick={() => choosePhase('break')}>Break</button></div></div><div className={`timer-orbit ${running ? 'running' : ''}`}><svg viewBox="0 0 320 320" aria-hidden="true"><circle className="orbit-base" cx="160" cy="160" r="145" /><circle className="orbit-progress" cx="160" cy="160" r="145" strokeDasharray={2 * Math.PI * 145} strokeDashoffset={2 * Math.PI * 145 * (1 - remaining / duration)} /></svg><div className="timer-face"><span className="eyebrow">{phase === 'break' ? 'BREATHE A LITTLE' : running ? 'YOU’RE IN YOUR ELEMENT' : 'YOUR TIME STARTS HERE'}</span><div className="timer-digits" role="timer" aria-label={`${minutes} minutes ${seconds} seconds remaining`}>{String(minutes).padStart(2, '0')}<span>:</span>{String(seconds).padStart(2, '0')}</div><span className="timer-caption">{phase === 'break' ? 'Rest is part of the work.' : `${Math.round(duration / 60)} minutes, just for this.`}</span></div></div><div className="timer-buttons"><button className="button primary large" onClick={toggle}>{running ? <Pause size={20} /> : <Play size={20} />}{running ? 'Pause session' : phase === 'break' ? 'Start break' : timer && remaining < duration ? 'Resume focus' : 'Start focus'}</button><button className="icon-button framed" aria-label="Reset timer" disabled={running} onClick={() => choosePhase(phase)}><RotateCcw size={19} /></button></div><button className={`ambient-toggle ${ambient ? 'active' : ''}`} aria-pressed={ambient} onClick={toggleAmbient}>{ambient ? <Volume2 size={16} /> : <Headphones size={16} />}Brown noise <span>{ambient ? 'ON' : 'OFF'}</span></button></section>
    <aside className="focus-sidebar"><section className="panel intention-panel"><div className="section-label"><span>THE INTENTION</span><span>01</span></div><h2>What matters<br />right now?</h2><label className="sr-only" htmlFor="intention">Session intention</label><textarea id="intention" maxLength={200} rows={3} placeholder="Finish that chapter. Solve that bug. Make a little progress." value={data.intention} disabled={running} onChange={event => setData({ ...data, intention: event.target.value })} /><div className="duration-options"><span className="field-caption">Focus length</span><div className="segmented">{[25, 45, 60].map(length => <button key={length} aria-pressed={data.minutes === length} disabled={running} onClick={() => changeMinutes("focus", length)}>{length}m</button>)}</div></div><div className="compact-fields"><label>Custom minutes<input type="number" min="1" max="120" value={data.minutes} disabled={running} onChange={event => { const value = Number(event.target.value); changeMinutes("focus", value); }} /></label><label>Break minutes<input type="number" min="1" max="30" value={data.breakMinutes} disabled={running} onChange={event => { const value = Number(event.target.value); changeMinutes("break", value); }} /></label></div></section><section className="panel focus-today"><div className="section-label"><span>TODAY, SO FAR</span><Coffee size={17} /></div><div className="focus-total">{totalMinutes}<span>minutes<br />well spent</span></div><div className="session-tokens">{Array.from({ length: Math.max(4, Math.min(12, today.length)) }, (_, index) => <span key={index} className={index < today.length ? 'complete' : ''}>{index < today.length ? <Check size={16} /> : '·'}</span>)}</div><p>{today.length} completed {today.length === 1 ? 'session' : 'sessions'}. Each one counts.</p></section></aside></div>
    <section className="session-history"><div className="section-heading"><h2>Recent sessions</h2><span>LAST 7 SESSIONS</span></div>{!data.sessions.length ? <div className="quiet-empty"><Clock3 size={18} />Your first completed session will appear here.</div> : data.sessions.slice(-7).reverse().map(session => <div className="session-row" key={session.id}><span className="session-check"><Check size={16} /></span><strong>{session.intention}</strong><span>{new Date(session.ended).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><span>{session.minutes} min</span></div>)}</section><div className="status-line" role="status">{notice || 'Your timer keeps its place if you refresh or switch apps. Breaks start only when you choose.'}</div>
  </>;
}
