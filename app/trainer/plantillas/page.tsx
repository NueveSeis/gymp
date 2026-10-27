import type { Metadata } from 'next'
import { requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { listExerciseOptions, listTemplates } from '@/lib/queries'
import { PageHeader } from '@/components/ui/basics'
import { TemplatesManager } from './templates-manager'

export async function generateMetadata(): Promise<Metadata> {
  const { systemName } = await getSettings()
  return { title: `Plantillas · ${systemName}` }
}

export default async function TemplatesPage() {
  await requirePageUser('staff')
  const [templates, exercises] = await Promise.all([listTemplates(), listExerciseOptions()])
  return (
    <>
      <PageHeader title="Plantillas de rutina" subtitle="Guarda tus rutinas típicas (Pierna A, Full body…) y asígnalas en segundos." />
      <TemplatesManager templates={templates} exercises={exercises} />
    </>
  )
}
