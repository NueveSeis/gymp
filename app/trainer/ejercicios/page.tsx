import type { Metadata } from 'next'
import { requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { listExercises } from '@/lib/queries'
import { PageHeader } from '@/components/ui/basics'
import { ExerciseLibrary, NewExerciseButton } from './exercise-library'

export async function generateMetadata(): Promise<Metadata> {
  const { systemName } = await getSettings()
  return { title: `Ejercicios · ${systemName}` }
}

export default async function ExercisesPage() {
  await requirePageUser('staff')
  const exercises = await listExercises()
  const groups = [...new Set(exercises.map((e) => e.muscleGroup).filter(Boolean))].sort((a, b) => a!.localeCompare(b!, 'es')) as string[]

  return (
    <>
      <PageHeader title="Ejercicios" subtitle={`${exercises.length} en tu biblioteca`} actions={<NewExerciseButton groups={groups} />} />
      <ExerciseLibrary exercises={exercises} groups={groups} />
    </>
  )
}
