// Demo-only PIN hashing in the browser. The real build hashes secrets server-side (bcrypt).
export async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('pact-demo:' + s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
