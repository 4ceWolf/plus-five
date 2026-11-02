import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, ArrowRight, RotateCcw, Check, Zap, Upload, Download, Layers, Pencil, BookOpen } from 'lucide-react';
import { PageHeading, useStore, uid, localDay, Modal, download, Empty } from '../shared';

type Card = { id: string; front: string; back: string; deck: string; due: number; interval: number; reviews: number; reviewedDay: string };
export function isCards(value: unknown): value is Card[] {
  return Array.isArray(value) && value.length <= 20000 && value.every(card => card && typeof card.id === 'string' && typeof card.front === 'string' && typeof card.back === 'string' && typeof card.deck === 'string' && Number.isFinite(card.due) && Number.isFinite(card.interval) && card.interval >= 0 && Number.isFinite(card.reviews) && card.reviews >= 0 && typeof card.reviewedDay === 'string');
}
const seeds = [
  ['What is the difference between a stack and a queue?', 'A stack is last-in, first-out (LIFO). A queue is first-in, first-out (FIFO). Think undo history versus a print queue.'],
  ['What does a pure function promise?', 'Given the same inputs, it returns the same output and causes no observable side effects.'],
  ['Why is a hash lookup usually called O(1)?', 'With a good hash function and a suitable load factor, the average lookup cost stays roughly constant as the collection grows. Worst-case behavior can be worse.'],
  ['What problem does a database transaction solve?', 'It groups operations into a unit with guarantees such as atomicity: either all changes are committed, or none are.'],
  ['In Rust, what happens when an owning value goes out of scope?', 'Its Drop implementation runs, if present, and the value’s owned resources are released.'],
  ['What is the difference between latency and throughput?', 'Latency is how long one operation takes. Throughput is how many operations finish per unit of time.']
];
const starter: Card[] = seeds.map(([front, back], index) => ({ id: `starter-${index}`, front, back, deck: 'Developer essentials', due: 0, interval: 0, reviews: 0, reviewedDay: '' }));

export function parseCardCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') { if (quoted && text[index + 1] === '"') { field += '"'; index++; } else quoted = !quoted; }
    else if (character === ',' && !quoted) { row.push(field); field = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) { if (character === '\r' && text[index + 1] === '\n') index++; row.push(field); if (row.some(value => value.trim())) rows.push(row); row = []; field = ''; }
    else field += character;
  }
  if (quoted) throw new Error('A quoted CSV field is not closed.');
  row.push(field); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

export default function RecallApp() {
  const [cards, setCards] = useStore<Card[]>('cards', starter, isCards);
  const [deck, setDeck] = useState('All decks');
  const [revealed, setRevealed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Card | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now());
  const upload = useRef<HTMLInputElement>(null);
  const decks = [...new Set(cards.map(card => card.deck))];
  const filtered = cards.filter(card => deck === 'All decks' || card.deck === deck);
  const due = filtered.filter(card => card.due <= now).sort((first, second) => first.due - second.due);
  const current = filtered.find(card => card.id === selectedId) || due[0];
  const reviewed = cards.filter(card => card.reviewedDay === localDay()).length;
  const goodDays = current ? (current.interval === 0 ? 1 : Math.min(365, Math.max(1, Math.round(current.interval * 2.2)))) : 1;
  const easyDays = current ? Math.min(365, Math.max(4, Math.round(current.interval * 3))) : 4;
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(interval); }, []);
  useEffect(() => { setRevealed(false); }, [current?.id]);
  function rate(rating: 'again' | 'good' | 'easy') {
    if (!current || !revealed) return;
    const interval = rating === 'again' ? 0 : rating === 'good' ? goodDays : easyDays;
    setCards(items => items.map(card => card.id === current.id ? { ...card, interval, due: Date.now() + (rating === 'again' ? 60000 : interval * 86400000), reviews: card.reviews + 1, reviewedDay: localDay() } : card));
    setSelectedId(null); setRevealed(false); setNow(Date.now());
    setNotice(rating === 'again' ? 'You’ll see that card again in one minute.' : `Scheduled again in ${interval} ${interval === 1 ? 'day' : 'days'}.`);
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (editing || browse || (event.target as HTMLElement).closest('input, textarea, select, button, a')) return;
      if (event.code === 'Space' && current) { event.preventDefault(); setRevealed(value => !value); }
      if (revealed && ['1', '2', '3'].includes(event.key)) { event.preventDefault(); rate(event.key === '1' ? 'again' : event.key === '2' ? 'good' : 'easy'); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  });
  function save(event: FormEvent) {
    event.preventDefault();
    if (!editing || !editing.front.trim() || !editing.back.trim() || !editing.deck.trim()) return;
    const clean = { ...editing, front: editing.front.trim(), back: editing.back.trim(), deck: editing.deck.trim() };
    setCards(items => items.some(card => card.id === clean.id) ? items.map(card => card.id === clean.id ? clean : card) : [...items, clean]);
    setEditing(null); setDeck('All decks'); setNow(Date.now());
  }
  async function importCards(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('Please choose a file smaller than 2 MB.');
      const text = await file.text();
      let incoming: { front: string; back: string; deck?: string }[];
      if (file.name.toLowerCase().endsWith('.json')) { incoming = JSON.parse(text); if (!Array.isArray(incoming)) throw new Error('The JSON must contain an array of cards.'); }
      else {
        const rows = parseCardCsv(text.replace(/^\uFEFF/, ''));
        if (rows[0]?.[0].trim().toLowerCase() === 'front' && rows[0]?.[1]?.trim().toLowerCase() === 'back') rows.shift();
        incoming = rows.map(row => ({ front: row[0], back: row[1], deck: row[2] }));
      }
      if (!incoming.length || incoming.length > 2000 || incoming.some(card => !card || typeof card.front !== 'string' || !card.front.trim() || typeof card.back !== 'string' || !card.back.trim() || card.front.length > 5000 || card.back.length > 10000 || (card.deck !== undefined && typeof card.deck !== 'string'))) throw new Error('Use 1–2,000 cards with nonempty front and back fields. CSV columns: front,back,deck (optional).');
      setCards(items => [...items, ...incoming.map(card => ({ id: uid(), front: card.front.trim(), back: card.back.trim(), deck: card.deck?.trim() || 'Imported', due: Date.now(), interval: 0, reviews: 0, reviewedDay: '' }))]);
      setNotice(`Imported ${incoming.length} cards. Your existing cards are preserved.`); setDeck('All decks'); setNow(Date.now());
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not import those cards.'); }
    if (upload.current) upload.current.value = '';
  }
  function newCard() { setDeleteConfirm(false); setEditing({ id: uid(), front: '', back: '', deck: deck === 'All decks' ? 'My studies' : deck, due: Date.now(), interval: 0, reviews: 0, reviewedDay: '' }); }

  return <><PageHeading eyebrow="03 / RECALL" title="Learn it. Keep it." description="A quiet place to turn “I think I know this” into “I’ve got this.”" action={<button className="button primary" onClick={newCard}><Plus size={18} /> New card</button>} />
    <div className="recall-layout"><aside className="deck-sidebar"><div className="section-label"><span>YOUR DECKS</span><Layers size={17} /></div>{['All decks', ...decks].map(name => <button className={`deck-choice ${deck === name ? 'active' : ''}`} key={name} onClick={() => { setDeck(name); setSelectedId(null); setRevealed(false); }}><BookOpen size={18} /><span>{name}<small>{cards.filter(card => name === 'All decks' || card.deck === name).length} cards</small></span><span className="deck-due">{cards.filter(card => (name === 'All decks' || card.deck === name) && card.due <= now).length}</span></button>)}<div className="deck-tools"><button className="text-button" onClick={() => upload.current?.click()}><Upload size={16} /> Import JSON / CSV</button><input type="file" accept=".json,.csv" ref={upload} hidden onChange={event => void importCards(event.target.files?.[0])} /><button className="text-button" onClick={() => download('recall-cards.json', JSON.stringify(cards, null, 2))}><Download size={16} /> Export cards</button><button className="text-button" onClick={() => setBrowse(true)}><Layers size={16} /> Browse & edit</button></div><div className="review-counter"><strong>{String(reviewed).padStart(2, '0')}</strong><span>cards visited today</span><div className="review-divider" /><p>Remembering is a practice.<br />A few cards is a good day.</p></div></aside>
    <section className="review-space"><div className="review-top"><span>{deck === 'All decks' ? 'TODAY’S REVIEW' : deck.toUpperCase()}</span><span>{due.length} ready to review</span></div>{current ? <><div className={`flashcard ${revealed ? 'revealed' : ''}`}><div className="flashcard-top"><span>{revealed ? 'THE ANSWER' : 'THE QUESTION'}</span><span>{current.deck}</span></div><div className="flashcard-content">{revealed && <div className="question-recap">{current.front}</div>}<h2>{revealed ? current.back : current.front}</h2></div><div className="flashcard-bottom"><span>{current.reviews === 0 ? 'First encounter' : `Reviewed ${current.reviews} times`}</span><button className="icon-button" aria-label="Edit this card" onClick={() => { setEditing({ ...current }); setDeleteConfirm(false); }}><Pencil size={17} /></button></div></div>{!revealed ? <button className="button primary reveal-button" onClick={() => setRevealed(true)}>Reveal answer <ArrowRight size={18} /><kbd>SPACE</kbd></button> : <div className="rating-buttons"><button onClick={() => rate('again')} className="rate-again"><RotateCcw size={19} /><strong>Again</strong><span>1 minute <kbd>1</kbd></span></button><button onClick={() => rate('good')} className="rate-good"><Check size={19} /><strong>Got it</strong><span>{goodDays} {goodDays === 1 ? 'day' : 'days'} <kbd>2</kbd></span></button><button onClick={() => rate('easy')} className="rate-easy"><Zap size={19} /><strong>Easy</strong><span>{easyDays} days <kbd>3</kbd></span></button></div>}<p className="review-hint">Try answering out loud before you flip the card.</p></> : <div className="review-finished"><div className="finished-symbol"><Check size={42} /></div><h2>{filtered.length ? 'A little wiser. All done for now.' : 'Your next idea belongs here.'}</h2><p>{filtered.length ? 'Your cards are scheduled. Come back when they’re due, or add something new.' : 'Create a card or import a deck to start learning.'}</p><button className="button primary" onClick={newCard}><Plus size={17} /> Add a card</button></div>}</section></div><div className="status-line" role="status">{notice || 'Includes an editable Developer essentials starter deck. Review timing follows your ratings.'}</div>
    {editing && <Modal title={cards.some(card => card.id === editing.id) ? 'Edit card' : 'Something worth remembering'} onClose={() => setEditing(null)}><form onSubmit={save} className="form-stack"><label>Deck<input required maxLength={80} value={editing.deck} onChange={event => setEditing({ ...editing, deck: event.target.value })} /></label><label>Front · the question<textarea required autoFocus rows={3} maxLength={5000} value={editing.front} onChange={event => setEditing({ ...editing, front: event.target.value })} /></label><label>Back · the answer<textarea required rows={4} maxLength={10000} value={editing.back} onChange={event => setEditing({ ...editing, back: event.target.value })} /></label><div className="modal-footer">{cards.some(card => card.id === editing.id) && <button type="button" className="text-button danger" onClick={() => { if (deleteConfirm) { setCards(items => items.filter(card => card.id !== editing.id)); setEditing(null); } else setDeleteConfirm(true); }}>{deleteConfirm ? 'Confirm delete' : 'Delete card'}</button>}<button type="submit" className="button primary">Save card <Check size={16} /></button></div></form></Modal>}
    {browse && <Modal title="Your cards" onClose={() => setBrowse(false)}><div className="card-browser">{filtered.map(card => <button key={card.id} onClick={() => { setBrowse(false); setEditing({ ...card }); setDeleteConfirm(false); }}><span>{card.front}<small>{card.deck}</small></span><Pencil size={17} /></button>)}{!filtered.length && <Empty title="No cards yet">Add a card to begin.</Empty>}</div></Modal>}
  </>;
}
