import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X, ArrowUpRight, Check, Download } from 'lucide-react';

export function uid() { return crypto.randomUUID(); }
export function localDay(timestamp = Date.now()) { const date = new Date(timestamp); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
const currentData = new Map<string, unknown>();
let storageFailed = false;
export function hasStorageFailure() { return storageFailed; }
export function backupData(keys: string[]) {
  const data: Record<string, unknown> = {};
  for (const key of keys) {
    if (currentData.has(key)) data[key] = currentData.get(key);
    else { try { const stored = localStorage.getItem(key); if (stored !== null) data[key] = JSON.parse(stored); } catch { } }
  }
  return data;
}
export function useStore<T>(key: string, initial: T, validate: (value: unknown) => value is T) {
  const fullKey = `plus-five:${key}`;
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(fullKey); if (raw) { const parsed: unknown = JSON.parse(raw); if (validate(parsed)) return parsed; } } catch { }
    return initial;
  });
  useEffect(() => {
    currentData.set(fullKey, value);
    try { localStorage.setItem(fullKey, JSON.stringify(value)); }
    catch { storageFailed = true; window.dispatchEvent(new CustomEvent('storage-warning')); }
  }, [value, fullKey]);
  return [value, setValue] as const;
}
export function download(name: string, body: string | Blob, type = 'application/json') {
  const url = URL.createObjectURL(typeof body === 'string' ? new Blob([body], { type }) : body);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const dialog = document.getElementById('active-dialog') as HTMLDialogElement;
    dialog.showModal();
    const cancel = (event: Event) => { event.preventDefault(); closeRef.current(); };
    dialog.addEventListener('cancel', cancel);
    return () => { dialog.removeEventListener('cancel', cancel); dialog.close(); before?.focus(); };
  }, []);
  return <dialog id="active-dialog" className="modal" aria-labelledby="dialog-title"><div className="modal-header"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>{children}</dialog>;
}
export function Empty({ title, children }: { title: string; children: ReactNode }) { return <div className="empty"><span className="empty-mark">+</span><h3>{title}</h3><p>{children}</p></div>; }
export function Tag({ children }: { children: ReactNode }) { return <span className="tag">{children}</span>; }
export function ExportButton({ name, data }: { name: string; data: unknown }) { return <button className="button secondary" onClick={() => download(name, JSON.stringify(data, null, 2))}><Download size={16} /> Export</button>; }
export function ProgressDots({ count, total }: { count: number; total: number }) { return <div className="progress-dots" aria-label={`${count} of ${total} complete`}>{Array.from({ length: total }, (_, index) => <span key={index} className={index < count ? 'filled' : ''} />)}</div>; }
export function SmallLink({ href, children }: { href: string; children: ReactNode }) { return <a className="small-link" href={href}>{children}<ArrowUpRight size={16} /></a>; }
export function Success({ children }: { children: ReactNode }) { return <div className="success"><Check size={18} />{children}</div>; }
