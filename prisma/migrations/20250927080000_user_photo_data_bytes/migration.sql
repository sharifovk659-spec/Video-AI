-- Store user photo bytes in MySQL when Vercel has no durable local disk.
ALTER TABLE `user_photo_uploads` ADD COLUMN `data_bytes` MEDIUMBLOB NULL;
