// Mapeo de las tablas MySQL existentes (mismos nombres de columnas que el
// esquema de Prisma original) + las tablas nuevas de database/migrations/002.
import {
  boolean,
  date,
  datetime,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core'

const timestamps = (name: string) => datetime(name, { mode: 'date', fsp: 3 })

export const roles = ['admin', 'trainer', 'client'] as const
export type Role = (typeof roles)[number]

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: mysqlEnum('role', roles).notNull(),
  fullName: varchar('full_name', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamps('created_at').notNull().$defaultFn(() => new Date()),
  lastLoginAt: timestamps('last_login_at'),
  phone: varchar('phone', { length: 30 }),
  goal: varchar('goal', { length: 255 }),
  notes: text('notes'),
})

export const exercises = mysqlTable('exercises', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 255 }),
  videoUrl: varchar('video_url', { length: 255 }),
  localImagePath: varchar('local_image_path', { length: 255 }),
  localVideoPath: varchar('local_video_path', { length: 255 }),
  muscleGroup: varchar('muscle_group', { length: 100 }),
  createdAt: timestamps('created_at').notNull().$defaultFn(() => new Date()),
  archivedAt: timestamps('archived_at'),
})

export const assignments = mysqlTable('assignments', {
  id: int('id').autoincrement().primaryKey(),
  clientId: int('client_id').notNull(),
  trainerId: int('trainer_id').notNull(),
  exerciseId: int('exercise_id').notNull(),
  // 'YYYY-MM-DD' como string: evita errores de zona horaria
  scheduledDate: date('scheduled_date', { mode: 'string' }).notNull(),
  sets: int('sets').notNull().default(0),
  reps: int('reps').notNull().default(0),
  completed: boolean('completed').notNull().default(false),
  restSeconds: int('rest_seconds'),
  trainerNotes: varchar('trainer_notes', { length: 255 }),
  weightKg: decimal('weight_kg', { precision: 6, scale: 2, mode: 'number' }),
  clientNote: varchar('client_note', { length: 255 }),
  completedAt: timestamps('completed_at'),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: timestamps('created_at').notNull().$defaultFn(() => new Date()),
})

export const systemSettings = mysqlTable('system_settings', {
  id: int('id').autoincrement().primaryKey(),
  systemName: varchar('system_name', { length: 100 }).notNull().default('GymPro'),
  logoUrl: varchar('logo_url', { length: 255 }),
  localLogoPath: varchar('local_logo_path', { length: 255 }),
  updatedAt: timestamps('updated_at')
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
})

export const routineTemplates = mysqlTable('routine_templates', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 255 }),
  createdBy: int('created_by'),
  createdAt: timestamps('created_at').notNull().$defaultFn(() => new Date()),
})

export const routineTemplateItems = mysqlTable('routine_template_items', {
  id: int('id').autoincrement().primaryKey(),
  templateId: int('template_id').notNull(),
  exerciseId: int('exercise_id').notNull(),
  sets: int('sets').notNull().default(3),
  reps: int('reps').notNull().default(10),
  restSeconds: int('rest_seconds'),
  notes: varchar('notes', { length: 255 }),
  sortOrder: int('sort_order').notNull().default(0),
})

export const bodyMetrics = mysqlTable('body_metrics', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  measuredOn: date('measured_on', { mode: 'string' }).notNull(),
  weightKg: decimal('weight_kg', { precision: 5, scale: 2, mode: 'number' }),
  bodyFatPct: decimal('body_fat_pct', { precision: 4, scale: 1, mode: 'number' }),
  notes: varchar('notes', { length: 255 }),
  createdAt: timestamps('created_at').notNull().$defaultFn(() => new Date()),
})

export type User = typeof users.$inferSelect
export type Exercise = typeof exercises.$inferSelect
export type Assignment = typeof assignments.$inferSelect
export type SystemSettings = typeof systemSettings.$inferSelect
