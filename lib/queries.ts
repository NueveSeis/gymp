import 'server-only'
import { and, asc, between, desc, eq, gte, inArray, isNotNull, isNull, lt, ne, sql } from 'drizzle-orm'
import { db, schema } from './db'
import type { DayAgg } from './stats'

const { users, exercises, assignments, routineTemplates, routineTemplateItems, bodyMetrics } = schema

const num = (v: unknown) => Number(v ?? 0)

// ── Ejercicios ──────────────────────────────────────────────

export const exerciseColumns = {
  id: exercises.id,
  name: exercises.name,
  description: exercises.description,
  imageUrl: exercises.imageUrl,
  videoUrl: exercises.videoUrl,
  localImagePath: exercises.localImagePath,
  localVideoPath: exercises.localVideoPath,
  muscleGroup: exercises.muscleGroup,
}
export type ExerciseRow = {
  id: number
  name: string
  description: string | null
  imageUrl: string | null
  videoUrl: string | null
  localImagePath: string | null
  localVideoPath: string | null
  muscleGroup: string | null
}

export function listExercises() {
  return db.select(exerciseColumns).from(exercises).where(isNull(exercises.archivedAt)).orderBy(asc(exercises.name))
}

export function listExerciseOptions() {
  return db
    .select({ id: exercises.id, name: exercises.name, muscleGroup: exercises.muscleGroup })
    .from(exercises)
    .where(isNull(exercises.archivedAt))
    .orderBy(asc(exercises.muscleGroup), asc(exercises.name))
}
export type ExerciseOption = Awaited<ReturnType<typeof listExerciseOptions>>[number]

// ── Clientes ────────────────────────────────────────────────

export function listClientOptions() {
  return db
    .select({ id: users.id, name: sql<string>`COALESCE(${users.fullName}, ${users.username})` })
    .from(users)
    .where(and(eq(users.role, 'client'), eq(users.isActive, true)))
    .orderBy(asc(sql`COALESCE(${users.fullName}, ${users.username})`))
}
export type ClientOption = Awaited<ReturnType<typeof listClientOptions>>[number]

export async function listClientsWithActivity(today: string) {
  // Agregados por cliente en una subconsulta (portable a MySQL y MariaDB)
  const activity = db
    .select({
      clientId: assignments.clientId,
      plannedUntil: sql<string | null>`MAX(${assignments.scheduledDate})`.as('planned_until'),
      lastCompletedAt: sql<string | null>`MAX(${assignments.completedAt})`.as('last_completed_at'),
      upcoming: sql<number>`SUM(CASE WHEN ${assignments.scheduledDate} >= ${today} THEN 1 ELSE 0 END)`.as('upcoming'),
    })
    .from(assignments)
    .groupBy(assignments.clientId)
    .as('activity')

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      isActive: users.isActive,
      phone: users.phone,
      goal: users.goal,
      notes: users.notes,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      plannedUntil: activity.plannedUntil,
      lastCompletedAt: activity.lastCompletedAt,
      upcoming: activity.upcoming,
    })
    .from(users)
    .leftJoin(activity, eq(activity.clientId, users.id))
    .where(eq(users.role, 'client'))
    .orderBy(asc(sql`COALESCE(${users.fullName}, ${users.username})`))
  return rows.map((r) => ({
    ...r,
    plannedUntil: r.plannedUntil ? String(r.plannedUntil).slice(0, 10) : null,
    upcoming: num(r.upcoming),
    lastCompletedAt: r.lastCompletedAt ? new Date(`${String(r.lastCompletedAt).replace(' ', 'T')}Z`) : null,
  }))
}
export type ClientWithActivity = Awaited<ReturnType<typeof listClientsWithActivity>>[number]

export async function getClient(id: number) {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      isActive: users.isActive,
      phone: users.phone,
      goal: users.goal,
      notes: users.notes,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, 'client')))
    .limit(1)
  return row ?? null
}

export function listStaff() {
  return db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(ne(users.role, 'client'))
    .orderBy(asc(users.role), asc(users.username))
}

// ── Asignaciones ────────────────────────────────────────────

const assignmentColumns = {
  id: assignments.id,
  clientId: assignments.clientId,
  exerciseId: assignments.exerciseId,
  scheduledDate: assignments.scheduledDate,
  sets: assignments.sets,
  reps: assignments.reps,
  completed: assignments.completed,
  restSeconds: assignments.restSeconds,
  trainerNotes: assignments.trainerNotes,
  weightKg: assignments.weightKg,
  clientNote: assignments.clientNote,
  sortOrder: assignments.sortOrder,
}

/** Rutina de un día para el cliente, con su mejor peso histórico por ejercicio */
export async function getClientDay(clientId: number, date: string) {
  return db
    .select({
      ...assignmentColumns,
      exercise: exerciseColumns,
      bestWeight: sql<number | null>`(
        SELECT MAX(p.weight_kg) FROM ${assignments} AS p
        WHERE p.client_id = ${assignments.clientId}
          AND p.exercise_id = ${assignments.exerciseId}
          AND p.id <> ${assignments.id}
      )`.mapWith((v) => (v === null ? null : Number(v))),
    })
    .from(assignments)
    .innerJoin(exercises, eq(exercises.id, assignments.exerciseId))
    .where(and(eq(assignments.clientId, clientId), eq(assignments.scheduledDate, date)))
    .orderBy(asc(assignments.sortOrder), asc(assignments.id))
}
export type ClientDayItem = Awaited<ReturnType<typeof getClientDay>>[number]

/** Totales por día (para semana, racha, mapa de constancia) */
export async function getDailyAggregates(clientId: number, from: string, to: string): Promise<DayAgg[]> {
  const rows = await db
    .select({
      date: assignments.scheduledDate,
      total: sql<number>`COUNT(*)`.mapWith(Number),
      done: sql<number>`SUM(CASE WHEN ${assignments.completed} THEN 1 ELSE 0 END)`.mapWith(Number),
    })
    .from(assignments)
    .where(and(eq(assignments.clientId, clientId), between(assignments.scheduledDate, from, to)))
    .groupBy(assignments.scheduledDate)
  return rows.map((r) => ({ date: String(r.date), total: num(r.total), done: num(r.done) }))
}

/** Vista semanal del entrenador: todo lo asignado entre dos fechas */
export function getAssignmentsInRange(from: string, to: string, clientId?: number) {
  return db
    .select({
      ...assignmentColumns,
      clientName: sql<string>`COALESCE(${users.fullName}, ${users.username})`,
      exerciseName: exercises.name,
      muscleGroup: exercises.muscleGroup,
    })
    .from(assignments)
    .innerJoin(exercises, eq(exercises.id, assignments.exerciseId))
    .innerJoin(users, eq(users.id, assignments.clientId))
    .where(
      and(between(assignments.scheduledDate, from, to), clientId ? eq(assignments.clientId, clientId) : undefined)
    )
    .orderBy(
      asc(assignments.scheduledDate),
      asc(sql`COALESCE(${users.fullName}, ${users.username})`),
      asc(assignments.sortOrder),
      asc(assignments.id)
    )
}
export type RangeAssignment = Awaited<ReturnType<typeof getAssignmentsInRange>>[number]

export async function getTrainerOverview(today: string, weekAgo: string) {
  const [clientCount, exerciseCount, todayByClient, week, idle, recent] = await Promise.all([
    db.$count(users, and(eq(users.role, 'client'), eq(users.isActive, true))),
    db.$count(exercises, isNull(exercises.archivedAt)),
    db
      .select({
        clientId: assignments.clientId,
        name: sql<string>`COALESCE(${users.fullName}, ${users.username})`,
        total: sql<number>`COUNT(*)`.mapWith(Number),
        done: sql<number>`SUM(CASE WHEN ${assignments.completed} THEN 1 ELSE 0 END)`.mapWith(Number),
        groups: sql<string | null>`GROUP_CONCAT(DISTINCT ${exercises.muscleGroup} SEPARATOR ', ')`,
      })
      .from(assignments)
      .innerJoin(users, eq(users.id, assignments.clientId))
      .innerJoin(exercises, eq(exercises.id, assignments.exerciseId))
      .where(eq(assignments.scheduledDate, today))
      .groupBy(assignments.clientId, users.fullName, users.username)
      .orderBy(asc(sql`COALESCE(${users.fullName}, ${users.username})`)),
    db
      .select({
        total: sql<number>`COUNT(*)`.mapWith(Number),
        done: sql<number>`SUM(CASE WHEN ${assignments.completed} THEN 1 ELSE 0 END)`.mapWith(Number),
      })
      .from(assignments)
      .where(between(assignments.scheduledDate, weekAgo, today)),
    db
      .select({
        id: users.id,
        name: sql<string>`COALESCE(${users.fullName}, ${users.username})`,
        lastDate: sql<string | null>`MAX(${assignments.scheduledDate})`,
      })
      .from(users)
      .leftJoin(assignments, eq(assignments.clientId, users.id))
      .where(and(eq(users.role, 'client'), eq(users.isActive, true)))
      .groupBy(users.id, users.fullName, users.username)
      .having(sql`MAX(${assignments.scheduledDate}) IS NULL OR MAX(${assignments.scheduledDate}) < ${today}`)
      .orderBy(asc(sql`MAX(${assignments.scheduledDate})`))
      .limit(8),
    db
      .select({
        id: assignments.id,
        clientId: assignments.clientId,
        clientName: sql<string>`COALESCE(${users.fullName}, ${users.username})`,
        exerciseName: exercises.name,
        weightKg: assignments.weightKg,
        completedAt: assignments.completedAt,
      })
      .from(assignments)
      .innerJoin(users, eq(users.id, assignments.clientId))
      .innerJoin(exercises, eq(exercises.id, assignments.exerciseId))
      .where(isNotNull(assignments.completedAt))
      .orderBy(desc(assignments.completedAt))
      .limit(10),
  ])
  const w = week[0]
  return {
    clients: num(clientCount),
    exercises: num(exerciseCount),
    today: todayByClient.map((r) => ({ ...r, total: num(r.total), done: num(r.done) })),
    weekRate: w && num(w.total) > 0 ? Math.round((num(w.done) / num(w.total)) * 100) : null,
    weekTotal: num(w?.total),
    idle,
    recent,
  }
}

// ── Progreso ────────────────────────────────────────────────

export async function getWeightProgress(clientId: number, since: string, limit = 6) {
  const rows = await db
    .select({
      exerciseId: assignments.exerciseId,
      name: exercises.name,
      date: assignments.scheduledDate,
      weight: sql<number>`MAX(${assignments.weightKg})`.mapWith(Number),
    })
    .from(assignments)
    .innerJoin(exercises, eq(exercises.id, assignments.exerciseId))
    .where(
      and(eq(assignments.clientId, clientId), isNotNull(assignments.weightKg), gte(assignments.scheduledDate, since))
    )
    .groupBy(assignments.exerciseId, exercises.name, assignments.scheduledDate)
    .orderBy(asc(assignments.scheduledDate))

  const byExercise = new Map<number, { exerciseId: number; name: string; points: { date: string; value: number }[] }>()
  for (const r of rows) {
    let entry = byExercise.get(r.exerciseId)
    if (!entry) byExercise.set(r.exerciseId, (entry = { exerciseId: r.exerciseId, name: r.name, points: [] }))
    entry.points.push({ date: String(r.date), value: num(r.weight) })
  }
  return [...byExercise.values()]
    .map((e) => ({
      ...e,
      best: Math.max(...e.points.map((p) => p.value)),
      first: e.points[0].value,
      last: e.points[e.points.length - 1].value,
    }))
    .sort((a, b) => b.points.length - a.points.length)
    .slice(0, limit)
}
export type WeightProgress = Awaited<ReturnType<typeof getWeightProgress>>[number]

export function getBodyMetrics(userId: number, limit = 60) {
  return db
    .select({
      id: bodyMetrics.id,
      measuredOn: bodyMetrics.measuredOn,
      weightKg: bodyMetrics.weightKg,
      bodyFatPct: bodyMetrics.bodyFatPct,
      notes: bodyMetrics.notes,
    })
    .from(bodyMetrics)
    .where(eq(bodyMetrics.userId, userId))
    .orderBy(desc(bodyMetrics.measuredOn))
    .limit(limit)
}
export type BodyMetricRow = Awaited<ReturnType<typeof getBodyMetrics>>[number]

export async function countCompleted(clientId: number) {
  const [row] = await db
    .select({ total: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(assignments)
    .where(and(eq(assignments.clientId, clientId), eq(assignments.completed, true)))
  return num(row?.total)
}

export async function getUpcomingDates(clientId: number, from: string, limit = 5) {
  const rows = await db
    .selectDistinct({ date: assignments.scheduledDate })
    .from(assignments)
    .where(and(eq(assignments.clientId, clientId), gte(assignments.scheduledDate, from)))
    .orderBy(asc(assignments.scheduledDate))
    .limit(limit)
  return rows.map((r) => String(r.date))
}

export async function getLastWorkoutBefore(clientId: number, before: string) {
  const [row] = await db
    .select({ date: sql<string | null>`MAX(${assignments.scheduledDate})` })
    .from(assignments)
    .where(and(eq(assignments.clientId, clientId), lt(assignments.scheduledDate, before), eq(assignments.completed, true)))
  return row?.date ? String(row.date) : null
}

// ── Plantillas ──────────────────────────────────────────────

export async function listTemplates() {
  const [templates, items] = await Promise.all([
    db
      .select({ id: routineTemplates.id, name: routineTemplates.name, description: routineTemplates.description })
      .from(routineTemplates)
      .orderBy(asc(routineTemplates.name)),
    db
      .select({
        id: routineTemplateItems.id,
        templateId: routineTemplateItems.templateId,
        exerciseId: routineTemplateItems.exerciseId,
        exerciseName: exercises.name,
        muscleGroup: exercises.muscleGroup,
        archived: sql<boolean>`${exercises.archivedAt} IS NOT NULL`.mapWith(Boolean),
        sets: routineTemplateItems.sets,
        reps: routineTemplateItems.reps,
        restSeconds: routineTemplateItems.restSeconds,
        notes: routineTemplateItems.notes,
      })
      .from(routineTemplateItems)
      .innerJoin(exercises, eq(exercises.id, routineTemplateItems.exerciseId))
      .orderBy(asc(routineTemplateItems.sortOrder), asc(routineTemplateItems.id)),
  ])
  return templates.map((t) => ({ ...t, items: items.filter((i) => i.templateId === t.id) }))
}
export type TemplateWithItems = Awaited<ReturnType<typeof listTemplates>>[number]

export async function getTemplateItems(templateId: number) {
  return db
    .select({
      exerciseId: routineTemplateItems.exerciseId,
      sets: routineTemplateItems.sets,
      reps: routineTemplateItems.reps,
      restSeconds: routineTemplateItems.restSeconds,
      notes: routineTemplateItems.notes,
    })
    .from(routineTemplateItems)
    .innerJoin(exercises, eq(exercises.id, routineTemplateItems.exerciseId))
    .where(and(eq(routineTemplateItems.templateId, templateId), isNull(exercises.archivedAt)))
    .orderBy(asc(routineTemplateItems.sortOrder), asc(routineTemplateItems.id))
}

export async function getDayItemsForCopy(clientId: number, date: string) {
  return db
    .select({
      exerciseId: assignments.exerciseId,
      sets: assignments.sets,
      reps: assignments.reps,
      restSeconds: assignments.restSeconds,
      trainerNotes: assignments.trainerNotes,
      sortOrder: assignments.sortOrder,
    })
    .from(assignments)
    .where(and(eq(assignments.clientId, clientId), eq(assignments.scheduledDate, date)))
    .orderBy(asc(assignments.sortOrder), asc(assignments.id))
}

export async function exercisesExist(ids: number[]) {
  if (ids.length === 0) return true
  const rows = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(inArray(exercises.id, ids), isNull(exercises.archivedAt)))
  return rows.length === new Set(ids).size
}

export async function clientsExist(ids: number[]) {
  if (ids.length === 0) return false
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, ids), eq(users.role, 'client')))
  return rows.length === new Set(ids).size
}
