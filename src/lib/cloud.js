// Thin wrappers around Supabase. Every call is a no-op when Supabase isn't configured,
// and failures are swallowed so the aquarium keeps working offline.
import { supabase } from './supabase.js';

const safe = async (fn, fallback = null) => {
  if (!supabase) return fallback;
  try { return await fn(); } catch (e) { console.warn('[aquaria cloud]', e?.message || e); return fallback; }
};

export const signUp = (email, password) => supabase.auth.signUp({ email, password });
export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
export const signOut = () => supabase?.auth.signOut();

export function watchAuth(cb) {
  if (!supabase) return () => {};
  supabase.auth.getSession().then(({ data }) => cb(data.session?.user ?? null));
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null));
  return () => data.subscription.unsubscribe();
}

export const pullAll = (uid) => safe(async () => {
  const [d, s, w, st] = await Promise.all([
    supabase.from('discoveries').select('species_id, discovered_at').eq('user_id', uid),
    supabase.from('high_scores').select('score').eq('user_id', uid).order('score', { ascending: false }).limit(1),
    supabase.from('world_unlocks').select('world_id').eq('user_id', uid),
    supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
  ]);
  return {
    discoveries: Object.fromEntries((d.data || []).map((r) => [r.species_id, new Date(r.discovered_at).getTime()])),
    highScore: s.data?.[0]?.score ?? 0,
    worlds: (w.data || []).map((r) => r.world_id),
    settings: st.data ? { sound: st.data.sound, volume: Number(st.data.volume), reduceMotion: st.data.reduce_motion, quality: st.data.quality } : null,
    lastWorld: st.data?.last_world ?? null,
  };
});

export const pushDiscoveries = (uid, map) => safe(() => {
  const rows = Object.entries(map).map(([species_id, ts]) => ({ user_id: uid, species_id, discovered_at: new Date(ts).toISOString() }));
  if (!rows.length) return null;
  return supabase.from('discoveries').upsert(rows, { onConflict: 'user_id,species_id', ignoreDuplicates: true });
});
export const pushScore = (uid, { score, round, worldId }) => safe(() => supabase.from('high_scores').insert({ user_id: uid, score, round, world_id: worldId }));
export const pushWorlds = (uid, ids) => safe(() => ids.length ? supabase.from('world_unlocks').upsert(ids.map((world_id) => ({ user_id: uid, world_id })), { onConflict: 'user_id,world_id', ignoreDuplicates: true }) : null);
export const pushSettings = (uid, s, lastWorld) => safe(() => supabase.from('user_settings').upsert({
  user_id: uid, sound: s.sound, volume: s.volume, reduce_motion: s.reduceMotion, quality: s.quality, last_world: lastWorld, updated_at: new Date().toISOString(),
}, { onConflict: 'user_id' }));
