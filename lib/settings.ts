import 'server-only'
import { db, schema } from './db'
import { mediaUrl } from './media'

export type AppSettings = { id: number; systemName: string; logoUrl: string | null; localLogoPath: string | null; logo: string | null }

const FALLBACK: AppSettings = { id: 0, systemName: 'GymPro', logoUrl: null, localLogoPath: null, logo: null }
const TTL_MS = 5 * 60_000

// Caché en memoria: la configuración casi nunca cambia y así no pagamos un
// viaje a la base de datos (remota en Hostinger) en cada página.
const store = globalThis as unknown as {
  __gympSettings?: { value: AppSettings; at: number } | null
  __gympSettingsInflight?: Promise<AppSettings> | null
}

async function load(): Promise<AppSettings> {
  let [row] = await db.select().from(schema.systemSettings).limit(1)
  if (!row) {
    await db.insert(schema.systemSettings).values({ systemName: 'GymPro' })
    ;[row] = await db.select().from(schema.systemSettings).limit(1)
  }
  return {
    id: row.id,
    systemName: row.systemName,
    logoUrl: row.logoUrl,
    localLogoPath: row.localLogoPath,
    logo: mediaUrl(row.localLogoPath) || row.logoUrl,
  }
}

export async function getSettings(): Promise<AppSettings> {
  // Durante `next build` no hay (ni debe haber) conexión a la base
  if (process.env.NEXT_PHASE === 'phase-production-build') return FALLBACK
  const cached = store.__gympSettings
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value
  store.__gympSettingsInflight ??= load()
    .then((value) => {
      store.__gympSettings = { value, at: Date.now() }
      return value
    })
    .catch((e) => {
      console.error('[settings] usando valores por defecto:', (e as Error).message)
      return store.__gympSettings?.value ?? FALLBACK
    })
    .finally(() => {
      store.__gympSettingsInflight = null
    })
  return store.__gympSettingsInflight
}

export function invalidateSettings() {
  store.__gympSettings = null
}
