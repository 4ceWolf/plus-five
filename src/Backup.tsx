import { useRef, useState } from 'react';
import { Download, Upload, Check } from 'lucide-react';
import { backupData, download, Modal } from './shared';
import { isQuests } from './apps/Quest';
import { isFocus } from './apps/Focus';
import { isCards } from './apps/Recall';
import { isBench } from './apps/Bench';
import { isSong } from './audio';

const validators: Record<string, (value: unknown) => boolean> = { 'plus-five:quests': isQuests, 'plus-five:focus': isFocus, 'plus-five:cards': isCards, 'plus-five:bench': isBench, 'plus-five:song': isSong };
export default function Backup({ onClose }: { onClose: () => void }) {
  const [candidate, setCandidate] = useState<Record<string, unknown> | null>(null);
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  function saveBackup() {
    try {
      const data = backupData(Object.keys(validators));
      download(`plus-five-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ version: 1, exported: new Date().toISOString(), data }, null, 2));
      setNotice('Backup downloaded. Keep it somewhere you can find again.');
    } catch { setNotice('Could not read browser storage. Individual apps can still export their open data.'); }
  }
  async function loadBackup(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 4_000_000) throw new Error('Choose a backup smaller than 4 MB.');
      const parsed = JSON.parse(await file.text());
      if (parsed?.version !== 1 || !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) throw new Error('This is not a Plus Five backup.');
      const entries = Object.entries(parsed.data);
      if (!entries.length || entries.some(([key, value]) => !Object.hasOwn(validators, key) || !validators[key](value))) throw new Error('The backup contains invalid app data. Nothing has changed.');
      setCandidate(parsed.data); setNotice('Backup checked. Restoring replaces data only for the apps included in this file.');
    } catch (error) { setCandidate(null); setNotice(error instanceof Error ? error.message : 'Could not read the backup.'); }
    if (fileInput.current) fileInput.current.value = '';
  }
  function restore() {
    if (!candidate) return;
    const previous: Record<string, string | null> = {};
    try {
      for (const key of Object.keys(candidate)) previous[key] = localStorage.getItem(key);
      for (const [key, value] of Object.entries(candidate)) localStorage.setItem(key, JSON.stringify(value));
      location.reload();
    } catch {
      for (const [key, value] of Object.entries(previous)) { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { } }
      setNotice('Restoring failed. Browser storage may be full or disabled. Previous values were restored where possible.');
    }
  }
  return <Modal title="Take your good things with you." onClose={onClose}><div className="backup-content"><p>Your data lives in this browser, on this address. Export it before moving computers, changing ports, or clearing browser data.</p><button className="button primary" onClick={saveBackup}><Download size={17} />Download backup</button><button className="button secondary" onClick={() => fileInput.current?.click()}><Upload size={17} />Choose a backup to restore</button><input type="file" accept=".json" hidden ref={fileInput} onChange={event => void loadBackup(event.target.files?.[0])} />{candidate && <div className="restore-preview"><strong>{Object.keys(candidate).length} apps in this backup</strong><p>Download your current backup first if you want to keep both versions.</p><button className="button secondary" onClick={restore}><Check size={17} />Replace included app data</button></div>}<p role="status" className="status-line">{notice}</p></div></Modal>;
}
