-- 002 · Funciones nuevas de la v2. Solo AGREGA columnas, índices y tablas:
-- no borra ni modifica tus datos existentes.
-- Compatible con MySQL 8 y MariaDB 10.5+ (Hostinger).

-- Asignaciones: detalles del entrenador y registro del cliente
ALTER TABLE `assignments` ADD COLUMN `rest_seconds` INT NULL;
ALTER TABLE `assignments` ADD COLUMN `trainer_notes` VARCHAR(255) NULL;
ALTER TABLE `assignments` ADD COLUMN `weight_kg` DECIMAL(6,2) NULL;
ALTER TABLE `assignments` ADD COLUMN `client_note` VARCHAR(255) NULL;
ALTER TABLE `assignments` ADD COLUMN `completed_at` DATETIME(3) NULL;
ALTER TABLE `assignments` ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0;
ALTER TABLE `assignments` ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
CREATE INDEX `assignments_client_date_idx` ON `assignments` (`client_id`, `scheduled_date`);
CREATE INDEX `assignments_date_idx` ON `assignments` (`scheduled_date`);
CREATE INDEX `assignments_completed_at_idx` ON `assignments` (`completed_at`);

-- Ejercicios: archivar en lugar de borrar cuando tienen historial
ALTER TABLE `exercises` ADD COLUMN `archived_at` DATETIME(3) NULL;

-- Usuarios: datos de perfil y último acceso
ALTER TABLE `users` ADD COLUMN `last_login_at` DATETIME(3) NULL;
ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(30) NULL;
ALTER TABLE `users` ADD COLUMN `goal` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN `notes` TEXT NULL;

-- Plantillas de rutina reutilizables
CREATE TABLE IF NOT EXISTS `routine_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_by` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `routine_templates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `routine_template_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `template_id` INT NOT NULL,
  `exercise_id` INT NOT NULL,
  `sets` INT NOT NULL DEFAULT 3,
  `reps` INT NOT NULL DEFAULT 10,
  `rest_seconds` INT NULL,
  `notes` VARCHAR(255) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `routine_template_items_template_idx` (`template_id`),
  CONSTRAINT `routine_template_items_template_fkey` FOREIGN KEY (`template_id`) REFERENCES `routine_templates` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `routine_template_items_exercise_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Medidas corporales del cliente (peso, % grasa)
CREATE TABLE IF NOT EXISTS `body_metrics` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `measured_on` DATE NOT NULL,
  `weight_kg` DECIMAL(5,2) NULL,
  `body_fat_pct` DECIMAL(4,1) NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `body_metrics_user_day_key` (`user_id`, `measured_on`),
  CONSTRAINT `body_metrics_user_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
