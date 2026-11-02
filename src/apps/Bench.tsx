import { Fragment, useEffect, useRef, useState } from 'react';
import { Braces, Regex, Code2, Copy, Check, Download, Plus, Search, Trash2, ArrowRight, ShieldCheck, Terminal } from 'lucide-react';
import { PageHeading, useStore, uid, download, Empty } from '../shared';

type Snippet = { id: string; name: string; language: string; body: string; updated: number };
type BenchData = { json: string; pattern: string; flags: string; text: string; snippets: Snippet[] };
type Match = { start: number; end: number; text: string; groups: (string | undefined)[] };
export function isBench(value: unknown): value is BenchData {
  const data = value as BenchData;
  return !!data && typeof data.json === 'string' && typeof data.pattern === 'string' && typeof data.flags === 'string' && typeof data.text === 'string' && Array.isArray(data.snippets) && data.snippets.every(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.language === 'string' && typeof item.body === 'string' && Number.isFinite(item.updated));
}
const initial: BenchData = { json: '{"project":"my-next-idea","language":"TypeScript","features":["works offline","feels good to use"],"ready":true}', pattern: '\\b[A-Z][a-z]+\\b', flags: 'g', text: 'Hello Kyo. Small tools make room for Big ideas. Keep making things.', snippets: [] };
const tools = [{ id: 'json', title: 'JSON studio', description: 'Bring a little order.', icon: Braces }, { id: 'regex', title: 'Regex playground', description: 'Find your pattern.', icon: Regex }, { id: 'snippets', title: 'Snippet library', description: 'Keep the good bits.', icon: Code2 }] as const;

export default function BenchApp() {
  const [data, setData] = useStore<BenchData>('bench', initial, isBench);
  const [tool, setTool] = useState<'json' | 'regex' | 'snippets'>('json');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [working, setWorking] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const current = data.snippets.find(snippet => snippet.id === activeId) || data.snippets[0];
  const filtered = data.snippets.filter(snippet => `${snippet.name} ${snippet.language} ${snippet.body}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { setError(''); setNotice(''); }, [tool]);
  useEffect(() => {
    if (tool !== 'regex') return;
    setMatches([]); setError(''); setWorking(true);
    let timeout: ReturnType<typeof setTimeout>;
    const debounce = setTimeout(() => {
      const worker = new Worker('/assets/regex-worker.js', { type: 'module' }); workerRef.current = worker;
      timeout = setTimeout(() => { worker.terminate(); setWorking(false); setError('This expression took too long. Try a simpler pattern or shorter text.'); }, 900);
      worker.onmessage = event => { clearTimeout(timeout); setWorking(false); worker.terminate(); if (event.data.error) { setError(event.data.error); setMatches([]); } else { setError(''); setMatches(event.data.matches); setTruncated(event.data.truncated); } };
      worker.onerror = () => { clearTimeout(timeout); worker.terminate(); setWorking(false); setError('The pattern worker could not start. Reload the page and try again.'); };
      worker.postMessage({ pattern: data.pattern, flags: data.flags, text: data.text });
    }, 200);
    return () => { clearTimeout(debounce); clearTimeout(timeout); workerRef.current?.terminate(); };
  }, [tool, data.pattern, data.flags, data.text]);
  function format(minify = false) {
    try { const parsed: unknown = JSON.parse(data.json); setResult(JSON.stringify(parsed, null, minify ? undefined : 2)); setError(''); setNotice('Valid JSON. Ready for whatever comes next.'); }
    catch (issue) { setResult(''); setError(issue instanceof Error ? issue.message : 'Invalid JSON.'); }
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice('Copied to clipboard.'); }
    catch { setNotice('Clipboard access is unavailable. Select the text to copy it manually.'); }
  }
  function updateSnippet(patch: Partial<Snippet>) {
    if (!current) return;
    setData(value => ({ ...value, snippets: value.snippets.map(snippet => snippet.id === current.id ? { ...snippet, ...patch, updated: Date.now() } : snippet) }));
  }
  function addSnippet() {
    const snippet = { id: uid(), name: 'Untitled snippet', language: 'TypeScript', body: '', updated: Date.now() };
    setData(value => ({ ...value, snippets: [snippet, ...value.snippets] })); setActiveId(snippet.id); setConfirmDelete(false); setQuery('');
  }
  let cursor = 0;
  const highlights = matches.map((match, index) => { const prefix = data.text.slice(cursor, match.start); cursor = match.end; return <Fragment key={index}>{prefix}<mark>{match.text || '∅'}</mark></Fragment>; });
  return <><PageHeading eyebrow="05 / WORKBENCH" title="Good tools. Clear head." description="The small utilities you always need, all in one private workspace." /><div className="bench-tabs">{tools.map(item => <button key={item.id} className={tool === item.id ? 'active' : ''} onClick={() => setTool(item.id)} aria-pressed={tool === item.id}><item.icon size={22} /><span>{item.title}<small>{item.description}</small></span><ArrowRight size={16} /></button>)}</div>
    {tool === 'json' && <section className="bench-workspace"><div className="editor-toolbar"><div><span className="editor-dot" /><span>JSON / FORMAT & VALIDATE</span></div><div><button className="text-button" onClick={() => format(true)}>Minify</button><button className="button primary small" onClick={() => format()}><Braces size={16} />Format JSON</button></div></div><div className="json-editors"><div className="editor-pane"><div className="editor-label"><span>INPUT</span><span>{new Blob([data.json]).size.toLocaleString()} bytes</span></div><textarea className="code-editor" aria-label="JSON input" spellCheck={false} maxLength={200000} value={data.json} onChange={event => { setData({ ...data, json: event.target.value }); setResult(''); setError(''); }} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); format(); } }} /></div><div className="editor-pane output-pane"><div className="editor-label"><span>OUTPUT</span><div><button className="icon-button" aria-label="Copy formatted JSON" disabled={!result} onClick={() => copy(result)}><Copy size={15} /></button><button className="icon-button" aria-label="Download formatted JSON" disabled={!result} onClick={() => download('formatted.json', result)}><Download size={15} /></button></div></div><textarea className={`code-editor ${!result ? 'placeholder-output' : ''}`} aria-label="Formatted JSON" readOnly value={result} placeholder="A little clarity awaits.\n\nFormat your JSON to see it here." spellCheck={false} /></div></div><div className="editor-foot"><span><ShieldCheck size={15} />Processed in your browser</span><span><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to format</span></div></section>}
    {tool === 'regex' && <section className="bench-workspace"><div className="regex-pattern"><span className="regex-slash">/</span><input aria-label="Regular expression" value={data.pattern} maxLength={5000} placeholder="Your expression" spellCheck={false} onChange={event => setData({ ...data, pattern: event.target.value })} /><span className="regex-slash">/</span><div className="regex-flags">{['g', 'i', 'm', 's', 'u'].map(flag => <button key={flag} aria-label={`Toggle ${flag} flag`} aria-pressed={data.flags.includes(flag)} onClick={() => setData({ ...data, flags: data.flags.includes(flag) ? data.flags.replace(flag, '') : data.flags + flag })}>{flag}</button>)}</div></div><div className="json-editors"><div className="editor-pane"><div className="editor-label"><span>TEST STRING</span><span>{data.text.length} characters</span></div><textarea className="code-editor" aria-label="Regex test text" spellCheck={false} value={data.text} maxLength={100000} onChange={event => setData({ ...data, text: event.target.value })} /></div><div className="editor-pane"><div className="editor-label"><span>LIVE MATCHES</span><span>{working ? 'Checking…' : `${matches.length}${truncated ? '+' : ''} matches`}</span></div><pre className="match-preview" aria-label="Highlighted regex matches">{highlights}{data.text.slice(cursor)}</pre></div></div>{matches.some(match => match.groups.length > 0) && <div className="capture-groups"><span className="tiny-label">CAPTURE GROUPS · FIRST 20 MATCHES</span>{matches.slice(0, 20).map((match, index) => <div key={index}><strong>Match {index + 1}</strong><code>{JSON.stringify(match.groups)}</code></div>)}</div>}<div className="editor-foot"><span><ShieldCheck size={15} />Timeout protection enabled</span><span>JavaScript expressions · up to 500 matches</span></div></section>}
    {tool === 'snippets' && <section className="snippet-workspace"><aside className="snippet-list"><div className="snippet-list-head"><h2>Your collection</h2><button className="icon-button framed" aria-label="New snippet" onClick={addSnippet}><Plus size={18} /></button></div><label className="search-field"><Search size={15} /><input aria-label="Search snippets" value={query} placeholder="Find a good bit…" onChange={event => setQuery(event.target.value)} /></label>{filtered.map(snippet => <button className={`snippet-choice ${current?.id === snippet.id ? 'active' : ''}`} key={snippet.id} onClick={() => { setActiveId(snippet.id); setConfirmDelete(false); }}><Code2 size={17} /><span>{snippet.name || 'Untitled snippet'}<small>{snippet.language}</small></span></button>)}{!filtered.length && <p className="muted small-copy">{data.snippets.length ? 'No matching snippets.' : 'Your future self will thank you.'}</p>}</aside><div className="snippet-detail">{current ? <><div className="snippet-detail-head"><input className="snippet-name" aria-label="Snippet name" value={current.name} maxLength={160} onChange={event => updateSnippet({ name: event.target.value })} /><select aria-label="Snippet language" value={current.language} onChange={event => updateSnippet({ language: event.target.value })}>{['TypeScript', 'JavaScript', 'Rust', 'Python', 'Shell', 'HTML', 'CSS', 'SQL', 'Other'].map(language => <option key={language}>{language}</option>)}</select></div><textarea className="code-editor" aria-label="Snippet code" value={current.body} maxLength={200000} spellCheck={false} placeholder="Keep something useful here…" onChange={event => updateSnippet({ body: event.target.value })} /><div className="snippet-actions"><button className="text-button danger" onClick={() => { if (confirmDelete) { setData(value => ({ ...value, snippets: value.snippets.filter(snippet => snippet.id !== current.id) })); setActiveId(null); setConfirmDelete(false); } else setConfirmDelete(true); }}><Trash2 size={15} />{confirmDelete ? 'Confirm delete' : 'Delete'}</button><div><button className="button secondary small" onClick={() => download(`${current.name.replace(/[^a-zA-Z0-9_-]+/g, '-') || 'snippet'}.txt`, current.body, 'text/plain')}><Download size={15} />Export</button><button className="button primary small" onClick={() => copy(current.body)}><Copy size={15} />Copy</button></div></div></> : <div className="snippet-empty"><Terminal size={40} /><h2>The good bits, together.</h2><p>Scripts, commands, and little things worth saving.</p><button className="button primary" onClick={addSnippet}><Plus size={17} />Save your first snippet</button></div>}</div></section>}
    {error && <div className="error-banner" role="alert">{error}</div>}<div className="status-line" role="status">{notice || 'No code is executed. No inputs leave your device.'}</div>
  </>;
}
