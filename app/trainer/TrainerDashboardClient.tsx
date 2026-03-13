'use client'

import { useState, useTransition } from 'react'
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from '@/actions/assignments'
import { createExercise, updateExercise, deleteExercise } from '@/actions/exercises'
import { createUser, updateUser, toggleUserStatus } from '@/actions/users'
import { updateSettings } from '@/actions/settings'
import { useRouter } from 'next/navigation'

type Client = { id: number; username: string; fullName: string | null; role: string; isActive: boolean }
type Exercise = { id: number; name: string; description: string | null; imageUrl: string | null; videoUrl: string | null; localImagePath: string | null; localVideoPath: string | null; muscleGroup: string | null }
type Assignment = {
  id: number; clientId: number; trainerId: number; exerciseId: number
  scheduledDate: string; sets: number; reps: number; completed: boolean
  exercise: Exercise
  client: { id: number; fullName: string | null; username: string }
}
type Setting = { id: number; systemName: string; logoUrl: string | null; localLogoPath: string | null }

type Tab = 'rutinas' | 'ejercicios' | 'clientes' | 'configuracion'

export default function TrainerDashboardClient({
  trainerId, clients, exercises, assignments, settings
}: {
  trainerId: number
  clients: Client[]
  exercises: Exercise[]
  assignments: Assignment[]
  settings: Setting
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('rutinas')
  const [isPending, startTransition] = useTransition()

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showEditAssign, setShowEditAssign] = useState<Assignment | null>(null)
  const [showDeleteAssign, setShowDeleteAssign] = useState<number | null>(null)
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [showEditExercise, setShowEditExercise] = useState<Exercise | null>(null)
  const [showDeleteExercise, setShowDeleteExercise] = useState<number | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showEditUser, setShowEditUser] = useState<Client | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterClient, setFilterClient] = useState<number | ''>('')

  const uniqueMuscleGroups = Array.from(new Set(exercises.map(e => e.muscleGroup).filter(Boolean))) as string[]

  const refresh = () => router.refresh()

  const filteredAssignments = filterClient
    ? assignments.filter(a => a.clientId === filterClient)
    : assignments

  function formatDate(d: Date | string) {
    const date = new Date(d)
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
  }

  function todayString() {
    return new Date().toISOString().split('T')[0]
  }

  async function handleAction(action: () => Promise<any>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) { setError(result.error); return }
      refresh()
    })
  }

  return (
    <div className="page">
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div>
            <div className="stat-value">{clients.length}</div>
            <div className="stat-label">Clientes activos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏋️</div>
          <div>
            <div className="stat-value">{exercises.length}</div>
            <div className="stat-label">Ejercicios</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div>
            <div className="stat-value">{assignments.length}</div>
            <div className="stat-label">Rutinas asignadas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div>
            <div className="stat-value">
              {assignments.filter(a => {
                const d = new Date(a.scheduledDate)
                const today = new Date()
                return d.toDateString() === today.toDateString()
              }).length}
            </div>
            <div className="stat-label">Rutinas hoy</div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab${tab === 'rutinas' ? ' active' : ''}`} onClick={() => setTab('rutinas')}>📋 Rutinas</button>
        <button className={`tab${tab === 'ejercicios' ? ' active' : ''}`} onClick={() => setTab('ejercicios')}>🏋️ Ejercicios</button>
        <button className={`tab${tab === 'clientes' ? ' active' : ''}`} onClick={() => setTab('clientes')}>👥 Clientes</button>
        <button className={`tab${tab === 'configuracion' ? ' active' : ''}`} onClick={() => setTab('configuracion')}>⚙️ Sistema</button>
      </div>

      {/* ── RUTINAS ── */}
      {tab === 'rutinas' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="card-title">📋 Rutinas asignadas</span>
            <div className="flex gap-3 items-center">
              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={filterClient}
                onChange={e => setFilterClient(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Todos los clientes</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.fullName || c.username}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAssignModal(true)}>+ Asignar</button>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Ejercicio</th>
                  <th>Fecha</th>
                  <th>Series</th>
                  <th>Reps</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sin rutinas asignadas</td></tr>
                ) : filteredAssignments.map(a => (
                  <tr key={a.id}>
                    <td><span className="badge badge-blue">{a.client.fullName || a.client.username}</span></td>
                    <td style={{ fontWeight: 500, textWrap: 'balance' }}>{a.exercise.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDate(a.scheduledDate)}</td>
                    <td><span className="badge badge-green">{a.sets}</span></td>
                    <td><span className="badge badge-green">{a.reps}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowEditAssign(a)}>✏️ Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteAssign(a.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EJERCICIOS ── */}
      {tab === 'ejercicios' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>🏋️ Biblioteca de ejercicios</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowExerciseModal(true)}>+ Nuevo ejercicio</button>
          </div>
          <div className="exercise-grid">
            {exercises.map(ex => (
              <div key={ex.id} className="exercise-card">
                <img
                  src={ex.localImagePath || ex.imageUrl || `https://placehold.co/400x200/1a2235/60a5fa?text=${encodeURIComponent(ex.name)}`}
                  alt={ex.name}
                  onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/400x200/1a2235/60a5fa?text=${encodeURIComponent(ex.name)}` }}
                />
                <div className="exercise-card-body">
                  <div className="exercise-card-title" style={{ textWrap: 'balance' }}>{ex.name}</div>
                  <div className="exercise-card-desc" style={{ textWrap: 'pretty' }}>{ex.description || 'Sin descripción'}</div>
                  {ex.muscleGroup && (
                    <div className="mt-2 mb-2">
                      <span className="badge badge-blue">💪 {ex.muscleGroup}</span>
                    </div>
                  )}
                  <div className="exercise-card-actions">
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setShowEditExercise(ex)}>✏️ Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteExercise(ex.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
            {exercises.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <span style={{ fontSize: '3rem' }}>🏋️</span>
                <p>No hay ejercicios. ¡Crea el primero!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CLIENTES ── */}
      {tab === 'clientes' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="card-title">👥 Gestión de clientes</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowUserModal(true)}>+ Nuevo cliente</button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Nombre</th><th>Usuario</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.fullName || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>@{c.username}</td>
                    <td>
                      <span className={`badge ${c.isActive ? 'badge-green' : 'badge-red'}`}>
                        {c.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowEditUser(c)}>✏️</button>
                        <button
                          className={`btn btn-sm ${c.isActive ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleAction(() => toggleUserStatus(c.id, !c.isActive))}
                        >
                          {c.isActive ? '🔒 Desactivar' : '🔓 Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Sin clientes registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DATALIST GLOBAL ── */}
      <datalist id="muscle-groups">
        {uniqueMuscleGroups.map(mg => <option key={mg} value={mg} />)}
      </datalist>

      {/* ── SETTINGS ── */}
      {tab === 'configuracion' && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="card-title">⚙️ Configuración del Sistema</span>
          </div>
          <form action={async (fd) => { fd.append('id', settings.id.toString()); await handleAction(() => updateSettings(fd)) }}>
            <div className="form-group">
              <label className="form-label" htmlFor="sys-name">Nombre del Sistema</label>
              <input id="sys-name" name="systemName" className="form-input" defaultValue={settings.systemName} required autoComplete="off" />
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label className="form-label">Reemplazar Logo</label>
              {(settings.localLogoPath || settings.logoUrl) && (
                <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Logo actual guardado ✓</div>
              )}
              <input name="logo" type="file" accept="image/*" className="form-input" />
              {(settings.localLogoPath || settings.logoUrl) && (
                <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input type="checkbox" name="remove_logo" value="true" />
                  Eliminar logo actual
                </label>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ext-logo">O usar URL de logo (externo)</label>
              <input id="ext-logo" name="logoUrl" className="form-input" defaultValue={settings.logoUrl || ''} type="url" placeholder="https://" autoComplete="off" />
            </div>
            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button type="submit" className="btn btn-primary btn-full" disabled={isPending}>Guardar Configuración</button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: Asignar rutina ── */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">📋 Asignar rutina</div>
            <form action={async (fd) => { await handleAction(() => createAssignment(fd)); setShowAssignModal(false) }}>
              <input type="hidden" name="trainerId" value={trainerId} />
              <div className="form-group">
                <label className="form-label">Cliente</label>
                <select name="clientId" className="form-select" required>
                  <option value="">Seleccionar cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.fullName || c.username}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ejercicio</label>
                <select name="exerciseId" className="form-select" required>
                  <option value="">Seleccionar ejercicio</option>
                  {exercises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input name="scheduledDate" type="date" className="form-input" defaultValue={todayString()} required />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Series</label>
                  <input name="sets" type="number" className="form-input" defaultValue={3} min={1} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Repeticiones</label>
                  <input name="reps" type="number" className="form-input" defaultValue={12} min={1} required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAssignModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>Asignar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Editar rutina ── */}
      {showEditAssign && (
        <div className="modal-overlay" onClick={() => setShowEditAssign(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">✏️ Editar rutina</div>
            <form action={async (fd) => { await handleAction(() => updateAssignment(fd)); setShowEditAssign(null) }}>
              <input type="hidden" name="id" value={showEditAssign.id} />
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input name="scheduledDate" type="date" className="form-input"
                  defaultValue={new Date(showEditAssign.scheduledDate).toISOString().split('T')[0]} required />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Series</label>
                  <input name="sets" type="number" className="form-input" defaultValue={showEditAssign.sets} min={1} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Repeticiones</label>
                  <input name="reps" type="number" className="form-input" defaultValue={showEditAssign.reps} min={1} required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditAssign(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Eliminar rutina ── */}
      {showDeleteAssign !== null && (
        <div className="modal-overlay" onClick={() => setShowDeleteAssign(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div className="modal-title">🗑️ Eliminar rutina</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>¿Estás seguro de que deseas eliminar esta rutina? Esta acción no se puede deshacer.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowDeleteAssign(null)}>Cancelar</button>
              <button className="btn btn-danger" disabled={isPending}
                onClick={() => handleAction(() => deleteAssignment(showDeleteAssign!)).then(() => setShowDeleteAssign(null))}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Crear ejercicio ── */}
      {showExerciseModal && (
        <div className="modal-overlay" onClick={() => setShowExerciseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🏋️ Nuevo ejercicio</div>
            <form action={async (fd) => { await handleAction(() => createExercise(fd)); setShowExerciseModal(false) }}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input name="name" className="form-input" placeholder="Nombre del ejercicio" required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="create-muscleGroup">Grupo Muscular</label>
                <input id="create-muscleGroup" list="muscle-groups" name="muscleGroup" className="form-input" placeholder="Ej. Pecho, Espalda, Pierna" autoComplete="off" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="create-desc">Descripción</label>
                <textarea id="create-desc" name="description" className="form-textarea" placeholder="Descripción del ejercicio..." />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Subir Imagen</label>
                  <input name="image" type="file" accept="image/*" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">O usar URL de imagen</label>
                  <input name="imageUrl" className="form-input" placeholder="https://..." type="url" />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Subir Video</label>
                  <input name="video" type="file" accept="video/*" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">O usar URL de video</label>
                  <input name="videoUrl" className="form-input" placeholder="https://youtube.com/..." type="url" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowExerciseModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Editar ejercicio ── */}
      {showEditExercise && (
        <div className="modal-overlay" onClick={() => setShowEditExercise(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">✏️ Editar ejercicio</div>
            <form action={async (fd) => { await handleAction(() => updateExercise(fd)); setShowEditExercise(null) }}>
              <input type="hidden" name="id" value={showEditExercise.id} />
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input name="name" className="form-input" defaultValue={showEditExercise.name} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-muscleGroup">Grupo Muscular</label>
                <input id="edit-muscleGroup" list="muscle-groups" name="muscleGroup" className="form-input" defaultValue={showEditExercise.muscleGroup || ''} placeholder="Ej. Pecho, Espalda, Pierna" autoComplete="off" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-desc">Descripción</label>
                <textarea id="edit-desc" name="description" className="form-textarea" defaultValue={showEditExercise.description || ''} />
              </div>
              <div className="form-grid">
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label className="form-label">Reemplazar Imagen</label>
                  {showEditExercise.localImagePath && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Imagen local actúal guardada ✓</div>
                  )}
                  <input name="image" type="file" accept="image/*" className="form-input" />
                  {showEditExercise.localImagePath && (
                    <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input type="checkbox" name="remove_image" value="true" />
                      Eliminar imagen actual
                    </label>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">O usar URL de imagen</label>
                  <input name="imageUrl" className="form-input" defaultValue={showEditExercise.imageUrl || ''} type="url" />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label className="form-label">Reemplazar Video</label>
                  {showEditExercise.localVideoPath && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Video local actúal guardado ✓</div>
                  )}
                  <input name="video" type="file" accept="video/*" className="form-input" />
                  {showEditExercise.localVideoPath && (
                    <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input type="checkbox" name="remove_video" value="true" />
                      Eliminar video actual
                    </label>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">O usar URL de video</label>
                  <input name="videoUrl" className="form-input" defaultValue={showEditExercise.videoUrl || ''} type="url" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditExercise(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Eliminar ejercicio ── */}
      {showDeleteExercise !== null && (
        <div className="modal-overlay" onClick={() => setShowDeleteExercise(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div className="modal-title">🗑️ Eliminar ejercicio</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>¿Eliminar este ejercicio? Las rutinas asignadas que lo usen también serán afectadas.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowDeleteExercise(null)}>Cancelar</button>
              <button className="btn btn-danger" disabled={isPending}
                onClick={() => handleAction(() => deleteExercise(showDeleteExercise!)).then(() => setShowDeleteExercise(null))}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Nuevo cliente ── */}
      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">👤 Nuevo cliente</div>
            <form action={async (fd) => { await handleAction(() => createUser(fd)); setShowUserModal(false) }}>
              <input type="hidden" name="role" value="client" />
              <div className="form-group">
                <label className="form-label">Nombre completo</label>
                <input name="fullName" className="form-input" placeholder="Juan Pérez" required />
              </div>
              <div className="form-group">
                <label className="form-label">Usuario</label>
                <input name="username" className="form-input" placeholder="juanperez" required />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input name="password" type="password" className="form-input" placeholder="••••••••" required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowUserModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Editar cliente ── */}
      {showEditUser && (
        <div className="modal-overlay" onClick={() => setShowEditUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">✏️ Editar cliente</div>
            <form action={async (fd) => { await handleAction(() => updateUser(fd)); setShowEditUser(null) }}>
              <input type="hidden" name="id" value={showEditUser.id} />
              <div className="form-group">
                <label className="form-label">Nombre completo</label>
                <input name="fullName" className="form-input" defaultValue={showEditUser.fullName || ''} />
              </div>
              <div className="form-group">
                <label className="form-label">Usuario</label>
                <input name="username" className="form-input" defaultValue={showEditUser.username} required />
              </div>
              <div className="form-group">
                <label className="form-label">Nueva contraseña (dejar vacío para no cambiar)</label>
                <input name="password" type="password" className="form-input" placeholder="••••••••" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditUser(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
