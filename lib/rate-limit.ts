import 'server-only'

// Límite de intentos de login en memoria (suficiente para un solo contenedor)
const WINDOW_MS = 15 * 60_000
const MAX_ATTEMPTS = 8
const g = globalThis as unknown as { __gympAttempts?: Map<string, { count: number; first: number }> }
const attempts = (g.__gympAttempts ??= new Map())

export function checkRateLimit(key: string): { allowed: boolean; retryInMin: number } {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || now - entry.first > WINDOW_MS) return { allowed: true, retryInMin: 0 }
  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryInMin: Math.ceil((WINDOW_MS - (now - entry.first)) / 60_000) }
  }
  return { allowed: true, retryInMin: 0 }
}

export function registerFailure(key: string) {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || now - entry.first > WINDOW_MS) attempts.set(key, { count: 1, first: now })
  else entry.count++
  if (attempts.size > 5000) {
    for (const [k, v] of attempts) if (now - v.first > WINDOW_MS) attempts.delete(k)
  }
}

export function clearFailures(key: string) {
  attempts.delete(key)
}
