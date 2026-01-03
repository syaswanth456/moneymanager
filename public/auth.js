let supabase = null;

export async function initSupabase() {
  if (supabase) return supabase;

  const cfg = await (await fetch('/api/config')).json();

  supabase = window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  return supabase;
}

export async function requireSession(redirect = '/login.html') {
  const sb = await initSupabase();
  const { data } = await sb.auth.getSession();
  if (!data?.session) {
    window.location.replace(redirect);
    throw new Error('Not authenticated');
  }
  return data.session;
}

export async function finalizeLogin(session) {
  await fetch('/api/auth/init', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });
}
