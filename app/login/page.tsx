export const dynamic = 'force-dynamic'

import { getSettings } from '@/actions/settings'
import LoginClient from './LoginClient'

export async function generateMetadata() {
  const settings = await getSettings()
  return {
    title: `${settings.systemName} | Login`,
  }
}

export default async function LoginPage() {
  const settings = await getSettings()

  return <LoginClient systemName={settings.systemName} logoUrl={settings.localLogoPath || settings.logoUrl} />
}
