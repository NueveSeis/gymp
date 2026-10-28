-- 001 · Esquema base (el mismo que ya existe en producción).
-- Si las tablas ya existen, estas sentencias no hacen nada.

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'trainer', 'client') NOT NULL,
  `full_name` VARCHAR(100) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `users_username_key` (`username`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exercises` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `image_url` VARCHAR(255) NULL,
  `video_url` VARCHAR(255) NULL,
  `local_image_path` VARCHAR(255) NULL,
  `local_video_path` VARCHAR(255) NULL,
  `muscle_group` VARCHAR(100) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `client_id` INT NOT NULL,
  `trainer_id` INT NOT NULL,
  `exercise_id` INT NOT NULL,
  `scheduled_date` DATE NOT NULL,
  `sets` INT NOT NULL DEFAULT 0,
  `reps` INT NOT NULL DEFAULT 0,
  `completed` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  CONSTRAINT `assignments_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `assignments_trainer_id_fkey` FOREIGN KEY (`trainer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `assignments_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `system_name` VARCHAR(100) NOT NULL DEFAULT 'GymPro',
  `logo_url` VARCHAR(255) NULL,
  `local_logo_path` VARCHAR(255) NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
