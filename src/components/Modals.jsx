import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, LogOut, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore.js';
import { cloudEnabled } from '../lib/supabase.js';
import * as cloud from '../lib/cloud.js';

function Modal({ open, onClose, label, children }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="modal glass" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.25 }}>
            <button className="icon-btn close" onClick={onClose} aria-label="Close"><X size={18} /></button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const Switch = ({ on, onChange, label }) => (
  <button role="switch" aria-checked={on} aria-label={label} className={'switch' + (on ? ' on' : '')} onClick={() => onChange(!on)}><i /></button>
);

export function SettingsModal() {
  const open = useStore((s) => s.settingsOpen);
  const close = () => useStore.getState().openSettings(false);
  const s = useStore((st) => st.settings);
  const set = useStore((st) => st.setSettings);
  const user = useStore((st) => st.user);
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!open) setSure(false); }, [open]);

  return (
    <Modal open={open} onClose={close} label="Settings">
      <h2 className="display">Settings</h2>
      <div className="row"><span>Sound</span><Switch on={s.sound} onChange={(v) => set({ sound: v })} label="Sound" /></div>
      <div className="row"><span>Volume</span><input type="range" min="0" max="1" step="0.05" value={s.volume} onChange={(e) => set({ volume: +e.target.value })} aria-label="Volume" /></div>
      <div className="row"><span>Reduce motion</span><Switch on={s.reduceMotion} onChange={(v) => set({ reduceMotion: v })} label="Reduce motion" /></div>
      <div className="row"><span>Quality</span>
        <div className="seg">{['low', 'balanced', 'high'].map((q) => <button key={q} className={s.quality === q ? 'on' : ''} onClick={() => set({ quality: q })}>{q[0].toUpperCase() + q.slice(1)}</button>)}</div>
      </div>
      <div className="row">
        <span>Account</span>
        {cloudEnabled
          ? user
            ? <button className="btn small" onClick={() => { cloud.signOut(); }}><LogOut size={15} /> {user.email}</button>
            : <button className="btn small" onClick={() => { close(); useStore.getState().openAuth(true); }}>Sign in</button>
          : <span className="dim">Saved on this device</span>}
      </div>
      <div className="row danger">
        <span>Progress</span>
        {sure
          ? <button className="btn small danger" onClick={() => { useStore.getState().resetProgress(); setSure(false); close(); }}><Trash2 size={15} /> Tap again to erase</button>
          : <button className="btn small" onClick={() => setSure(true)}>Reset</button>}
      </div>
    </Modal>
  );
}

export function AuthModal() {
  const open = useStore((s) => s.authOpen);
  const close = () => useStore.getState().openAuth(false);
  const user = useStore((s) => s.user);
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) { setMsg(''); setPw(''); } }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      const { data, error } = mode === 'in' ? await cloud.signIn(email, pw) : await cloud.signUp(email, pw);
      if (error) setMsg(error.message);
      else if (mode === 'up' && !data.session) setMsg('Check your email to confirm, then sign in.');
      else close();
    } catch (err) { setMsg(err.message || 'Something went wrong'); }
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={close} label="Account">
      {user ? (
        <>
          <h2 className="display">Signed in</h2>
          <p className="sub">{user.email}</p>
          <button className="btn" onClick={() => { cloud.signOut(); close(); }}><LogOut size={16} /> Sign out</button>
        </>
      ) : (
        <form onSubmit={submit}>
          <h2 className="display">{mode === 'in' ? 'Welcome back' : 'Save your reef'}</h2>
          <label className="field"><span>Email</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="field"><span>Password</span><input type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          {msg && <p className="msg" role="alert">{msg}</p>}
          <button className="btn primary wide" disabled={busy}>{busy ? '…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
          <button type="button" className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(''); }}>{mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}</button>
        </form>
      )}
    </Modal>
  );
}
