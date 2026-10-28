import type { Metadata } from 'next'
import { requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { todayIso } from '@/lib/dates'
import { listClientsWithActivity } from '@/lib/queries'
import { PageHeader } from '@/components/ui/basics'
import { NewClientButton } from './client-form'
import { ClientsList } from './clients-list'

export async function generateMetadata(): Promise<Metadata> {
  const { systemName } = await getSettings()
  return { title: `Clientes · ${systemName}` }
}

export default async function ClientsPage() {
  await requirePageUser('staff')
  const today = todayIso()
  const clients = await listClientsWithActivity(today)

  return (
    <>
      <PageHeader title="Clientes" subtitle={`${clients.filter((c) => c.isActive).length} activos · ${clients.length} en total`} actions={<NewClientButton />} />
      <ClientsList clients={clients} today={today} />
    </>
  )
}
