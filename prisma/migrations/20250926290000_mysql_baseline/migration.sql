-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `free_generations_used` INTEGER NOT NULL DEFAULT 0,
    `free_generations_granted` INTEGER NOT NULL DEFAULT 2,
    `free_quota_blocked` BOOLEAN NOT NULL DEFAULT false,
    `abuse_score` INTEGER NOT NULL DEFAULT 0,
    `signup_fingerprint` VARCHAR(128) NULL,
    `last_free_generation_at` DATETIME(3) NULL,
    `is_blocked` BOOLEAN NOT NULL DEFAULT false,

    INDEX `users_signup_fingerprint_idx`(`signup_fingerprint`),
    INDEX `users_abuse_score_idx`(`abuse_score`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `telegram_accounts` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `telegram_user_id` BIGINT NOT NULL,
    `username` VARCHAR(255) NULL,
    `first_name` VARCHAR(255) NULL,
    `last_name` VARCHAR(255) NULL,
    `language_code` VARCHAR(16) NULL,
    `is_premium` BOOLEAN NOT NULL DEFAULT false,
    `photo_url` VARCHAR(2048) NULL,
    `last_active_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `telegram_accounts_user_id_key`(`user_id`),
    UNIQUE INDEX `telegram_accounts_telegram_user_id_key`(`telegram_user_id`),
    INDEX `telegram_accounts_username_idx`(`username`),
    INDEX `telegram_accounts_last_active_at_idx`(`last_active_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `template_categories` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `template_categories_slug_key`(`slug`),
    INDEX `template_categories_is_active_sort_order_idx`(`is_active`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_providers` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `ai_providers_slug_key`(`slug`),
    INDEX `ai_providers_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_models` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `provider_id` CHAR(36) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `ai_models_is_active_idx`(`is_active`),
    UNIQUE INDEX `ai_models_provider_id_slug_key`(`provider_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templates` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `ai_model_id` CHAR(36) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `thumbnail_url` VARCHAR(2048) NULL,
    `cover_url` VARCHAR(2048) NULL,
    `preview_video_url` VARCHAR(2048) NULL,
    `cover_storage_key` VARCHAR(512) NULL,
    `preview_storage_key` VARCHAR(512) NULL,
    `duration_seconds` INTEGER NULL,
    `aspect_ratio` VARCHAR(16) NULL,
    `is_trending` BOOLEAN NOT NULL DEFAULT false,
    `is_new` BOOLEAN NOT NULL DEFAULT false,
    `is_popular` BOOLEAN NOT NULL DEFAULT false,
    `estimated_api_cost_cents` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('draft', 'active', 'archived') NOT NULL DEFAULT 'draft',
    `is_pro` BOOLEAN NOT NULL DEFAULT false,
    `credit_cost` INTEGER NOT NULL DEFAULT 0,
    `prompt` TEXT NOT NULL,
    `negative_prompt` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `current_version` INTEGER NOT NULL DEFAULT 0,
    `cloned_from_id` CHAR(36) NULL,

    UNIQUE INDEX `templates_slug_key`(`slug`),
    INDEX `templates_category_id_status_sort_order_idx`(`category_id`, `status`, `sort_order`),
    INDEX `templates_status_is_pro_idx`(`status`, `is_pro`),
    INDEX `templates_status_is_trending_sort_order_idx`(`status`, `is_trending`, `sort_order`),
    INDEX `templates_status_is_new_created_at_idx`(`status`, `is_new`, `created_at` DESC),
    INDEX `templates_status_is_popular_sort_order_idx`(`status`, `is_popular`, `sort_order`),
    INDEX `templates_status_title_idx`(`status`, `title`),
    FULLTEXT INDEX `templates_title_description_idx`(`title`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `template_versions` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `template_id` CHAR(36) NOT NULL,
    `version_number` INTEGER NOT NULL,
    `created_by_user_id` CHAR(36) NULL,
    `change_note` VARCHAR(512) NULL,
    `title` VARCHAR(255) NOT NULL,
    `prompt` TEXT NOT NULL,
    `negative_prompt` TEXT NULL,
    `ai_model_id` CHAR(36) NOT NULL,
    `provider_slug` VARCHAR(64) NOT NULL,
    `model_slug` VARCHAR(128) NOT NULL,
    `duration_seconds` INTEGER NULL,
    `aspect_ratio` VARCHAR(16) NULL,
    `credit_cost` INTEGER NOT NULL,
    `cover_url` VARCHAR(2048) NULL,
    `preview_video_url` VARCHAR(2048) NULL,
    `status` ENUM('draft', 'active', 'archived') NOT NULL,

    INDEX `template_versions_template_id_created_at_idx`(`template_id`, `created_at` DESC),
    UNIQUE INDEX `template_versions_template_id_version_number_key`(`template_id`, `version_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_photo_uploads` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_id` CHAR(36) NOT NULL,
    `storage_key` VARCHAR(512) NOT NULL,
    `original_file_name` VARCHAR(255) NULL,
    `mime_type` VARCHAR(64) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `expires_at` DATETIME(3) NULL,
    `purpose` VARCHAR(32) NOT NULL DEFAULT 'user_photo',

    UNIQUE INDEX `user_photo_uploads_storage_key_key`(`storage_key`),
    INDEX `user_photo_uploads_user_id_created_at_idx`(`user_id`, `created_at` DESC),
    INDEX `user_photo_uploads_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `generations` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `template_id` CHAR(36) NOT NULL,
    `template_version_id` CHAR(36) NULL,
    `photo_upload_id` CHAR(36) NULL,
    `status` ENUM('queued', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'queued',
    `stage` VARCHAR(64) NULL,
    `output_url` VARCHAR(2048) NULL,
    `output_storage_key` VARCHAR(512) NULL,
    `error_message` TEXT NULL,
    `credits_charged` INTEGER NOT NULL DEFAULT 0,
    `credits_reserved` INTEGER NOT NULL DEFAULT 0,
    `credits_finalized` BOOLEAN NOT NULL DEFAULT false,
    `used_free_quota` BOOLEAN NOT NULL DEFAULT false,
    `credits_refunded` BOOLEAN NOT NULL DEFAULT false,
    `provider_slug` VARCHAR(64) NULL,
    `provider_model_slug` VARCHAR(128) NULL,
    `provider_request_id` VARCHAR(255) NULL,
    `estimated_provider_cost_cents` INTEGER NOT NULL DEFAULT 0,
    `idempotency_key` VARCHAR(128) NULL,
    `snapshotted_prompt` TEXT NULL,
    `snapshotted_negative_prompt` TEXT NULL,
    `user_prompt` VARCHAR(2000) NULL,
    `duration_seconds` INTEGER NULL,
    `aspect_ratio` VARCHAR(16) NULL,
    `is_studio` BOOLEAN NOT NULL DEFAULT false,
    `notified_completed_at` DATETIME(3) NULL,
    `notified_failed_at` DATETIME(3) NULL,

    UNIQUE INDEX `generations_idempotency_key_key`(`idempotency_key`),
    INDEX `generations_user_id_created_at_idx`(`user_id`, `created_at` DESC),
    INDEX `generations_user_id_status_created_at_idx`(`user_id`, `status`, `created_at` DESC),
    INDEX `generations_status_created_at_idx`(`status`, `created_at`),
    INDEX `generations_template_id_created_at_idx`(`template_id`, `created_at` DESC),
    INDEX `generations_template_version_id_idx`(`template_version_id`),
    INDEX `generations_provider_request_id_idx`(`provider_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `generation_jobs` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `generation_id` CHAR(36) NOT NULL,
    `status` ENUM('queued', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'queued',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 3,
    `scheduled_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `locked_until` DATETIME(3) NULL,
    `timed_out_at` DATETIME(3) NULL,
    `last_error` TEXT NULL,
    `next_poll_at` DATETIME(3) NULL,

    UNIQUE INDEX `generation_jobs_generation_id_key`(`generation_id`),
    INDEX `generation_jobs_status_scheduled_at_idx`(`status`, `scheduled_at`),
    INDEX `generation_jobs_status_locked_until_next_poll_at_idx`(`status`, `locked_until`, `next_poll_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_wallets` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `balance` INTEGER NOT NULL DEFAULT 0,
    `reserved` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `credit_wallets_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_transactions` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `wallet_id` CHAR(36) NOT NULL,
    `type` ENUM('credit', 'debit', 'refund', 'adjustment', 'reserve', 'finalize') NOT NULL,
    `amount` INTEGER NOT NULL,
    `balance_after` INTEGER NOT NULL,
    `reserved_after` INTEGER NOT NULL DEFAULT 0,
    `reason` VARCHAR(255) NOT NULL,
    `note` VARCHAR(512) NULL,
    `admin_actor_id` CHAR(36) NULL,
    `generation_id` CHAR(36) NULL,
    `payment_id` CHAR(36) NULL,
    `metadata` JSON NULL,

    INDEX `credit_transactions_wallet_id_created_at_idx`(`wallet_id`, `created_at` DESC),
    INDEX `credit_transactions_generation_id_idx`(`generation_id`),
    INDEX `credit_transactions_payment_id_idx`(`payment_id`),
    INDEX `credit_transactions_admin_actor_id_idx`(`admin_actor_id`),
    INDEX `credit_transactions_type_created_at_idx`(`type`, `created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `plan_code` VARCHAR(64) NOT NULL,
    `status` ENUM('active', 'cancelled', 'expired', 'past_due') NOT NULL DEFAULT 'active',
    `current_period_start` DATETIME(3) NOT NULL,
    `current_period_end` DATETIME(3) NOT NULL,
    `external_id` VARCHAR(255) NULL,

    UNIQUE INDEX `subscriptions_external_id_key`(`external_id`),
    INDEX `subscriptions_user_id_status_idx`(`user_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_packages` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `credits` INTEGER NOT NULL,
    `price_cents` INTEGER NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'USD',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_popular` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `benefits` TEXT NULL,

    UNIQUE INDEX `credit_packages_slug_key`(`slug`),
    INDEX `credit_packages_is_active_sort_order_idx`(`is_active`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `package_id` CHAR(36) NULL,
    `amount_cents` INTEGER NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'USD',
    `credits_to_grant` INTEGER NOT NULL DEFAULT 0,
    `credits_granted` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
    `provider` VARCHAR(64) NOT NULL,
    `external_id` VARCHAR(255) NOT NULL,
    `description` VARCHAR(512) NULL,
    `metadata` JSON NULL,
    `paid_at` DATETIME(3) NULL,
    `failed_at` DATETIME(3) NULL,
    `refunded_at` DATETIME(3) NULL,

    UNIQUE INDEX `payments_external_id_key`(`external_id`),
    INDEX `payments_user_id_created_at_idx`(`user_id`, `created_at` DESC),
    INDEX `payments_status_paid_at_idx`(`status`, `paid_at`),
    INDEX `payments_status_idx`(`status`),
    INDEX `payments_package_id_idx`(`package_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_webhook_events` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `provider` VARCHAR(64) NOT NULL,
    `event_key` VARCHAR(255) NOT NULL,
    `payment_id` CHAR(36) NULL,
    `payload_hash` VARCHAR(128) NULL,
    `processed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payment_webhook_events_event_key_key`(`event_key`),
    INDEX `payment_webhook_events_provider_created_at_idx`(`provider`, `created_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorites` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_id` CHAR(36) NOT NULL,
    `template_id` CHAR(36) NOT NULL,

    INDEX `favorites_user_id_idx`(`user_id`),
    UNIQUE INDEX `favorites_user_id_template_id_key`(`user_id`, `template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_settings` (
    `id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `key` VARCHAR(128) NOT NULL,
    `value` JSON NOT NULL,
    `description` VARCHAR(512) NULL,

    UNIQUE INDEX `app_settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `telegram_accounts` ADD CONSTRAINT `telegram_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_models` ADD CONSTRAINT `ai_models_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `ai_providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `templates` ADD CONSTRAINT `templates_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `template_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `templates` ADD CONSTRAINT `templates_ai_model_id_fkey` FOREIGN KEY (`ai_model_id`) REFERENCES `ai_models`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `templates` ADD CONSTRAINT `templates_cloned_from_id_fkey` FOREIGN KEY (`cloned_from_id`) REFERENCES `templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_versions` ADD CONSTRAINT `template_versions_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_versions` ADD CONSTRAINT `template_versions_ai_model_id_fkey` FOREIGN KEY (`ai_model_id`) REFERENCES `ai_models`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_photo_uploads` ADD CONSTRAINT `user_photo_uploads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generations` ADD CONSTRAINT `generations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generations` ADD CONSTRAINT `generations_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generations` ADD CONSTRAINT `generations_template_version_id_fkey` FOREIGN KEY (`template_version_id`) REFERENCES `template_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generations` ADD CONSTRAINT `generations_photo_upload_id_fkey` FOREIGN KEY (`photo_upload_id`) REFERENCES `user_photo_uploads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generation_jobs` ADD CONSTRAINT `generation_jobs_generation_id_fkey` FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_wallets` ADD CONSTRAINT `credit_wallets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_transactions_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `credit_wallets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_transactions_generation_id_fkey` FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_transactions_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `credit_packages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_webhook_events` ADD CONSTRAINT `payment_webhook_events_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
