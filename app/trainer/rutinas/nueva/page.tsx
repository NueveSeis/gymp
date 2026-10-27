import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Dumbbell } from 'lucide-react'
import { requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { isIsoDate, todayIso } from '@/lib/dates'
import { listClientOptions, listExerciseOptions, listTemplates } from '@/lib/queries'
import { EmptyState, PageHeader } from '@/components/ui/basics'
import { RoutineBuilder } from './routine-builder'

export async function generateMetadata(): Promise<Metadata> {
  const { systemName } = await getSettings()
  return { title: `Asignar rutina · ${systemName}` }
}

export default async function NewRoutinePage({ searchParams }: PageProps<'/trainer/rutinas/nueva'>) {
  await requirePageUser('staff')
  const sp = await searchParams
  const [clients, exercises, templates] = await Promise.all([listClientOptions(), listExerciseOptions(), listTemplates()])
  const clientId = Number(sp.client)
  const templateId = Number(sp.template)

  return (
    <>
      <Link href="/trainer/rutinas" className="btn btn-ghost btn-sm mb-3 -ml-2">
        <ArrowLeft className="size-4" /> Rutinas
      </Link>
      <PageHeader title="Asignar rutina" subtitle="Arma la rutina una vez y asígnala a varios clientes o repítela cada semana." />
      {exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Primero crea ejercicios"
          action={
            <Link href="/trainer/ejercicios" className="btn btn-primary">
              Ir a ejercicios
            </Link>
          }
        >
          Necesitas al menos un ejercicio en la biblioteca para armar rutinas.
        </EmptyState>
      ) : (
        <RoutineBuilder
          clients={clients}
          exercises={exercises}
          templates={templates.map((t) => ({ id: t.id, name: t.name, items: t.items.filter((i) => !i.archived) }))}
          initialClientIds={clients.some((c) => c.id === clientId) ? [clientId] : []}
          initialDate={isIsoDate(sp.date) ? sp.date : todayIso()}
          initialTemplateId={templates.some((t) => t.id === templateId) ? templateId : undefined}
        />
      )}
    </>
  )
}
