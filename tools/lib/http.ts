import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';

/** Respeta HTTP(S)_PROXY del entorno (Node no lo hace por defecto en fetch). */
setGlobalDispatcher(new EnvHttpProxyAgent());

export const USER_AGENT = 'uap-campus-poc/0.1 (+https://github.com/dest92/uapgame)';

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 90_000): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} en ${new URL(url).host}`);
  return res;
}
