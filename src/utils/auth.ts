// Mocked auth helpers. Wire these to Supabase later.
export async function signInWithGoogle() {
  await new Promise((r) => setTimeout(r, 400));
  return { ok: true, provider: 'google' };
}

export async function signInWithApple() {
  await new Promise((r) => setTimeout(r, 400));
  return { ok: true, provider: 'apple' };
}

