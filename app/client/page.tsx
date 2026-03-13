export const dynamic = 'force-dynamic'

import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getAssignments } from '@/actions/assignments'
import { getSettings } from '@/actions/settings'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default async function ClientPage(props: { searchParams?: Promise<{ date?: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'client') redirect('/trainer')

  const searchParams = await props.searchParams;
  const dateQuery = searchParams?.date;

  const settings = await getSettings();

  // Manejo de fecha sin verse afectado por la zona horaria del servidor
  let targetDate = new Date();
  if (dateQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateQuery)) {
    const [yyyy, mm, dd] = dateQuery.split('-');
    targetDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }

  const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  const assignments = await getAssignments(session.id, dateStr);

  const dailyMuscleGroups = Array.from(new Set(assignments.map((a: any) => a.exercise.muscleGroup).filter(Boolean))) as string[];

  // Calcular día anterior
  const prevDate = new Date(targetDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;

  // Calcular día siguiente
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;

  function getYouTubeId(url: string) {
    const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  return (
    <>
      <Navbar username={session.username} role={session.role} systemName={settings.systemName} logoUrl={settings.localLogoPath || settings.logoUrl} />
      <div className="page">
        <div className="page-header">
          <h1>¡Hola, {session.fullName || session.username}! 💪</h1>
          <div className="date-navigator" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <Link href={`/client?date=${prevDateStr}`} className="btn btn-ghost btn-sm">
              ◀ Anterior
            </Link>
            <div className="date-navigator-text" style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                {targetDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <Link href={`/client?date=${nextDateStr}`} className="btn btn-ghost btn-sm">
              Siguiente ▶
            </Link>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ marginBottom: '0.5rem' }}>¡Sin rutina por hoy!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Tu entrenador no te ha asignado ejercicios para hoy. Descansa o consulta con él.</p>
          </div>
        ) : (
          <>
            <div className="stats-grid client-stats" style={{ maxWidth: '600px', marginBottom: '2rem' }}>
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div>
                  <div className="stat-value">{assignments.length}</div>
                  <div className="stat-label">Ejercicios</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔁</div>
                <div>
                  <div className="stat-value">{assignments.reduce((s: number, a: any) => s + a.sets, 0)}</div>
                  <div className="stat-label">Series totales</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⚡</div>
                <div>
                  <div className="stat-value">{assignments.reduce((s: number, a: any) => s + a.reps, 0)}</div>
                  <div className="stat-label">Reps totales</div>
                </div>
              </div>
            </div>

            {dailyMuscleGroups.length > 0 && (
              <div className="card" style={{
                marginBottom: '2rem',
                padding: '2rem',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--accent)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-light)', marginBottom: '0.5rem' }}>
                    Enfoque del día
                  </p>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
                    Hoy trabajamos: <span style={{ color: 'var(--text-primary)' }}>{dailyMuscleGroups.join(', ')}</span>
                  </h2>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {dailyMuscleGroups.map(mg => (
                      <span key={mg} className="badge badge-blue" style={{
                        padding: '0.6rem 1.2rem',
                        fontSize: '0.85rem',
                        borderRadius: '12px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1.1rem' }}>💪</span> {mg}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Subtle background decoration */}
                <div style={{
                  position: 'absolute',
                  right: '-20px',
                  bottom: '-20px',
                  fontSize: '8rem',
                  opacity: 0.05,
                  transform: 'rotate(-15deg)',
                  pointerEvents: 'none'
                }}>
                  🏋️
                </div>
              </div>
            )}

            <div className="workout-grid">
              {assignments.map((a: any, i: number) => {
                const ex = a.exercise
                const ytId = ex.videoUrl ? getYouTubeId(ex.videoUrl) : null
                const imgSrc = ex.localImagePath || ex.imageUrl || `https://placehold.co/600x300/1a2235/60a5fa?text=${encodeURIComponent(ex.name)}`

                return (
                  <div key={a.id} className="workout-card">
                    <img
                      src={imgSrc}
                      alt={ex.name}
                    />
                    <div className="workout-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{ex.name}</h3>
                        <span className="badge badge-blue">#{i + 1}</span>
                      </div>
                      {ex.description && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textWrap: 'balance' }}>{ex.description}</p>
                      )}
                      {ex.muscleGroup && (
                        <div style={{ marginBottom: '1rem' }}>
                          <span className="badge badge-blue">💪 {ex.muscleGroup}</span>
                        </div>
                      )}
                      <div className="workout-meta">
                        <div className="workout-stat">
                          <span className="workout-stat-value">{a.sets}</span>
                          <span className="workout-stat-label">Series</span>
                        </div>
                        <div className="workout-stat">
                          <span className="workout-stat-value">{a.reps}</span>
                          <span className="workout-stat-label">Repeticiones</span>
                        </div>
                      </div>
                      {ex.localVideoPath ? (
                        <video controls width="100%" style={{ marginTop: '0.75rem', borderRadius: '8px' }}>
                          <source src={ex.localVideoPath} type="video/mp4" />
                          Tu navegador no soporta el formato de video.
                        </video>
                      ) : ytId ? (
                        <iframe
                          width="100%"
                          height="220"
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title={`Video de ${ex.name}`}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ marginTop: '0.75rem', borderRadius: '8px' }}
                        ></iframe>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}
