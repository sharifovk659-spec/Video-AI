CREATE TABLE `template_media_objects` (
    `storage_key` VARCHAR(512) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `kind` VARCHAR(32) NOT NULL,
    `mime_type` VARCHAR(64) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `data_bytes` LONGBLOB NOT NULL,

    INDEX `template_media_objects_kind_idx`(`kind`),
    PRIMARY KEY (`storage_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
