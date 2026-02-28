-- CreateTable
CREATE TABLE IF NOT EXISTS `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'trainer', 'client') NOT NULL,
    `full_name` VARCHAR(100) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `exercises` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `image_url` VARCHAR(255) NULL,
    `video_url` VARCHAR(255) NULL,
    `local_image_path` VARCHAR(255) NULL,
    `local_video_path` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_id` INTEGER NOT NULL,
    `trainer_id` INTEGER NOT NULL,
    `exercise_id` INTEGER NOT NULL,
    `scheduled_date` DATE NOT NULL,
    `sets` INTEGER NOT NULL DEFAULT 0,
    `reps` INTEGER NOT NULL DEFAULT 0,
    `completed` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_trainer_id_fkey` FOREIGN KEY (`trainer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed Data
INSERT IGNORE INTO `users` (`username`, `password`, `role`, `full_name`) VALUES
('admin', 'admin123', 'admin', 'System Admin'),
('trainer1', 'pass123', 'trainer', 'Juan Trainer'),
('client1', 'pass123', 'client', 'Pedro Client');

INSERT IGNORE INTO `exercises` (`name`, `description`, `image_url`, `video_url`) VALUES
('Push Up', 'Standard push up', 'https://placehold.co/600x400?text=Push+Up', 'https://www.youtube.com/watch?v=IODxDxX7oi4'),
('Squat', 'Bodyweight squat', 'https://placehold.co/600x400?text=Squat', 'https://www.youtube.com/watch?v=aclHkVaku9U');
