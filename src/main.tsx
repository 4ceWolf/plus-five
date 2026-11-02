import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, Plus, LayoutGrid, Timer, Layers, AudioLines, Braces, Download, ShieldCheck, Menu, X } from 'lucide-react';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import './styles.css';
import { hasStorageFailure } from './shared';
import QuestApp from './apps/Quest';
import FocusApp from './apps/Focus';
import RecallApp from './apps/Recall';
import PatchApp from './apps/Patch';
import BenchApp from './apps/Bench';
import Backup from './Backup';

const apps = [
  { id: 'quest', name: 'Questline', detail: 'Make progress', icon: LayoutGrid, component: QuestApp },
  { id: 'focus', name: 'Still', detail: 'Find your focus', icon: Timer, component: FocusApp },
  { id: 'recall', name: 'Recall', detail: 'Make it stick', icon: Layers, component: RecallApp },
  { id: 'patch', name: 'Patch', detail: 'Find your sound', icon: AudioLines, component: PatchApp },
  { id: 'bench', name: 'Workbench', detail: 'Build something', icon: Braces, component: BenchApp }
];
function App() {
  const active = apps.find(app => app.id === location.pathname.split('/')[1]) || apps[0];
  const [menu, setMenu] = useState(false);
  const [warning, setWarning] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width:760px)').matches);
  useEffect(() => {
    const query = matchMedia('(max-width:760px)');
    const update = () => setNarrow(query.matches);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); };
    query.addEventListener('change', update);
    window.addEventListener('keydown', escape);
    return () => { query.removeEventListener('change', update); window.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => {
    document.title = `${active.name} · Plus Five`;
    const handler = () => setWarning(true);
    if (hasStorageFailure()) setWarning(true);
    window.addEventListener('storage-warning', handler);
    return () => window.removeEventListener('storage-warning', handler);
  }, [active.name]);
  function backup() {
    setShowBackup(true);
  }
  const CurrentApp = active.component;
  return <div className={`app-shell theme-${active.id}`}><a href="#main-content" className="skip-link">Skip to workspace</a>{showBackup && <Backup onClose={() => setShowBackup(false)} />}
    <aside id="program-navigation" className={`sidebar ${menu ? 'open' : ''}`} inert={narrow && !menu}><a className="brand" href="/quest"><span className="brand-mark"><Plus size={24} strokeWidth={3} /></span><span>plus<span className="brand-five">five</span><small>YOUR EVERYDAY UPGRADE</small></span></a><div className="sidebar-caption">YOUR LITTLE TOOLKIT</div><nav aria-label="Programs">{apps.map((app, index) => <a className={`nav-item ${active.id === app.id ? 'selected' : ''}`} key={app.id} href={`/${app.id}`} aria-current={active.id === app.id ? 'page' : undefined}><app.icon size={20} /><span>{app.name}<small>{app.detail}</small></span><span className="nav-number">0{index + 1}</span></a>)}</nav><div className="sidebar-bottom"><div className="local-note"><ShieldCheck size={19} /><div>Yours. All yours.<small>No accounts. No cloud.</small></div></div><button className="backup-button" onClick={backup}><Download size={16} /> Back up all data<ArrowUpRight size={14} /></button><div className="profile"><span className="avatar">K</span><div>Made for Kyo<small>A little more possibility.</small></div><span className="profile-plus">+</span></div></div></aside>
    <div className="main-wrap"><header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="program-navigation" aria-label={menu ? 'Close navigation' : 'Open navigation'}>{menu ? <X size={20} /> : <Menu size={20} />}</button><span>The collection</span><span className="slash">/</span><strong>{active.name}</strong></div><div className="topbar-right"><button className="icon-button compact-backup" aria-label="Back up or restore data" onClick={backup}><Download size={17} /></button><span className="top-date">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><span className="local-label">LOCAL EDITION <span>01</span></span></div></header><main id="main-content">{warning && <div className="error-banner" role="alert">Browser storage is unavailable or full. Changes will last only for this visit. Use “Back up all data” before closing.</div>}<CurrentApp /></main><footer className="app-footer"><span>BUILT FOR THE THINGS YOU LOVE.</span><span>MUSIC <i /> GAMES <i /> MAKING THINGS</span></footer></div>
  </div>;
}
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="fatal"><h1>Something interrupted this session.</h1><p>Your saved data is still in this browser.</p><button onClick={() => location.reload()}>Reload Plus Five</button></div> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App /></ErrorBoundary>);
