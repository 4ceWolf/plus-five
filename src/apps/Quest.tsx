import { useState, type FormEvent } from 'react';
import { Plus, ArrowRight, Check, MoreHorizontal, Search, Flag, Trophy, RotateCcw, Play, Sparkles } from 'lucide-react';
import { useStore, uid, localDay, PageHeading, Modal, Empty, Tag } from '../shared';

type Lane = 'backlog' | 'active' | 'done';
type Area = 'Study' | 'Build' | 'Life';
type Quest = { id: string; title: string; note: string; area: Area; effort: number; lane: Lane; due: string; completed: string | null };
export function isQuests(value: unknown): value is Quest[] {
  return Array.isArray(value) && value.length <= 10000 && value.every(item => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.note === 'string' && ['Study', 'Build', 'Life'].includes(item.area) && [20, 40, 80].includes(item.effort) && ['backlog', 'active', 'done'].includes(item.lane) && typeof item.due === 'string' && (item.completed === null || typeof item.completed === 'string'));
}
const lanes: { id: Lane; name: string; subtitle: string }[] = [{ id: 'backlog', name: 'Up next', subtitle: 'The possibilities' }, { id: 'active', name: 'In progress', subtitle: 'One thing at a time' }, { id: 'done', name: 'Completed', subtitle: 'Proof you showed up' }];
const blank: Omit<Quest, 'id'> = { title: '', note: '', area: 'Study', effort: 40, lane: 'backlog', due: '', completed: null };

export default function QuestApp() {
  const [quests, setQuests] = useStore<Quest[]>('quests', [], isQuests);
  const [filter, setFilter] = useState('All quests');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Quest | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const experience = quests.filter(quest => quest.lane === 'done').reduce((sum, quest) => sum + quest.effort, 0);
  const level = Math.floor(experience / 200) + 1;
  const completedToday = quests.filter(quest => quest.completed === localDay()).length;
  const filtered = quests.filter(quest => (filter === 'All quests' || quest.area === filter) && `${quest.title} ${quest.note}`.toLowerCase().includes(search.toLowerCase()));

  function move(quest: Quest, lane: Lane) {
    setQuests(current => current.map(item => item.id === quest.id ? { ...item, lane, completed: lane === 'done' ? localDay() : null } : item));
    setAnnouncement(lane === 'done' ? `Quest complete. +${quest.effort} XP. Nice work.` : `${quest.title} moved to ${lane === 'active' ? 'In progress' : 'Up next'}.`);
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!editing?.title.trim()) return;
    const clean = { ...editing, title: editing.title.trim(), note: editing.note.trim() };
    setQuests(current => current.some(quest => quest.id === clean.id) ? current.map(quest => quest.id === clean.id ? clean : quest) : [...current, clean]);
    setEditing(null);
  }
  function starter() {
    setQuests(current => [...current,
      { ...blank, id: uid(), title: 'Turn one difficult topic into 5 flashcards', note: 'Pick a topic you keep putting off. Open Recall after you understand it.', area: 'Study', effort: 40, lane: 'active' },
      { ...blank, id: uid(), title: 'Ship one small improvement', note: 'A useful script, a bug fix, or a little thing you can finish today.', area: 'Build', effort: 80 },
      { ...blank, id: uid(), title: 'Take a walk without your phone', note: 'Ten minutes counts.', area: 'Life', effort: 20 }
    ]);
  }
  return <>
    <PageHeading eyebrow="01 / QUESTLINE" title="Make room for your next win." description="A little structure. A little XP. A day that feels like progress." action={<button className="button primary" onClick={() => { setEditing({ ...blank, id: uid() }); setConfirmDelete(false); }}><Plus size={18} /> New quest</button>} />
    <section className="quest-banner">
      <div className="level-emblem"><Trophy size={29} /><span>LVL {String(level).padStart(2, '0')}</span></div>
      <div className="level-copy"><div className="eyebrow">YOUR ADVENTURE</div><h2>{level === 1 ? 'Every great run starts somewhere.' : 'Look at you, making things happen.'}</h2><div className="xp-row"><div className="meter"><span style={{ width: `${experience % 200 / 2}%` }} /></div><span>{experience % 200} / 200 XP to level {level + 1}</span></div></div>
      <div className="today-count"><strong>{String(completedToday).padStart(2, '0')}</strong><span>quests finished today</span></div>
    </section>
    <div className="work-toolbar"><div className="segmented" aria-label="Quest category">{['All quests', 'Study', 'Build', 'Life'].map(area => <button key={area} aria-pressed={filter === area} onClick={() => setFilter(area)}>{area}</button>)}</div><label className="search-field"><Search size={16} /><input aria-label="Find a quest" placeholder="Find a quest…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
    {!quests.length && <div className="starter-callout"><Sparkles size={19} /><span>Want a little momentum? Start with three editable quests.</span><button className="text-button" onClick={starter}>Try starter quests <ArrowRight size={16} /></button></div>}
    <div className="quest-board">{lanes.map(lane => <section className={`quest-lane ${lane.id}`} key={lane.id}><header><div><h2>{lane.name}<span className="count">{filtered.filter(quest => quest.lane === lane.id).length}</span></h2><p>{lane.subtitle}</p></div><span className="lane-symbol">{lane.id === 'done' ? '✓' : lane.id === 'active' ? '◒' : '○'}</span></header><div className="quest-stack">{filtered.filter(quest => quest.lane === lane.id).map(quest => <article className="quest-card" key={quest.id}><div className="card-top"><Tag>{quest.area}</Tag><button className="icon-button" aria-label={`Edit ${quest.title}`} onClick={() => { setEditing({ ...quest }); setConfirmDelete(false); }}><MoreHorizontal size={19} /></button></div><h3>{quest.title}</h3>{quest.note && <p>{quest.note}</p>}<div className="quest-meta"><span><Sparkles size={13} />{quest.effort} XP</span>{quest.due && <span className={quest.due < localDay() && quest.lane !== 'done' ? 'overdue' : ''}><Flag size={13} />{quest.due}</span>}</div><div className="quest-actions">{quest.lane === 'backlog' && <button className="text-button" onClick={() => move(quest, 'active')}>Start quest <ArrowRight size={15} /></button>}{quest.lane === 'active' && <><a className="text-button muted" href="/focus"><Play size={14} /> Focus</a><button className="button small primary" onClick={() => move(quest, 'done')}><Check size={15} /> Complete</button></>}{quest.lane === 'done' && <button className="text-button muted" onClick={() => move(quest, 'backlog')}><RotateCcw size={14} /> Reopen quest</button>}</div></article>)}{!filtered.some(quest => quest.lane === lane.id) && <div className="lane-empty">{lane.id === 'done' ? 'Your wins will collect here.' : lane.id === 'active' ? 'Choose a quest. Give it your attention.' : 'A fresh page for your next idea.'}</div>}</div></section>)}</div>
    <div className="status-line" role="status">{announcement || 'Progress, at your own pace. No streaks to lose.'}</div>
    {editing && <Modal title={quests.some(quest => quest.id === editing.id) ? 'Edit quest' : 'Your next quest'} onClose={() => setEditing(null)}><form onSubmit={save} className="form-stack"><label>What will you do?<input autoFocus required maxLength={160} value={editing.title} onChange={event => setEditing({ ...editing, title: event.target.value })} placeholder="Something small enough to finish" /></label><label>A little context<textarea rows={3} maxLength={1000} value={editing.note} onChange={event => setEditing({ ...editing, note: event.target.value })} placeholder="What does done look like?" /></label><div className="form-row"><label>Category<select value={editing.area} onChange={event => setEditing({ ...editing, area: event.target.value as Area })}>{['Study', 'Build', 'Life'].map(area => <option key={area}>{area}</option>)}</select></label><label>Effort<select value={editing.effort} onChange={event => setEditing({ ...editing, effort: Number(event.target.value) })}><option value={20}>Small · 20 XP</option><option value={40}>Medium · 40 XP</option><option value={80}>Big · 80 XP</option></select></label></div><label>Due date · optional<input type="date" value={editing.due} onChange={event => setEditing({ ...editing, due: event.target.value })} /></label><div className="modal-footer">{quests.some(quest => quest.id === editing.id) && <button type="button" className="text-button danger" onClick={() => { if (confirmDelete) { setQuests(current => current.filter(quest => quest.id !== editing.id)); setEditing(null); } else setConfirmDelete(true); }}>{confirmDelete ? 'Confirm delete' : 'Delete quest'}</button>}<button className="button primary" type="submit">Save quest <Check size={16} /></button></div></form></Modal>}
  </>;
}
