import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getUsers } from '@/actions/users'
import { getExercises } from '@/actions/exercises'
import { getAssignments } from '@/actions/assignments'
import Navbar from '@/components/Navbar'
import TrainerDashboardClient from './TrainerDashboardClient'

export default async function TrainerPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'client') redirect('/client')

  const [clients, exercises, rawAssignments] = await Promise.all([
    getUsers('client'),
    getExercises(),
    getAssignments(),
  ])

  // Serializar las fechas a string para que sean compatibles con el componente cliente
  const assignments = rawAssignments.map(a => ({
    ...a,
    scheduledDate: a.scheduledDate.toISOString(),
  }))

  return (
    <>
      <Navbar username={session.username} role={session.role} />
      <TrainerDashboardClient
        trainerId={session.id}
        clients={clients}
        exercises={exercises}
        assignments={assignments}
      />
    </>
  )
}
