-- AlterTable
ALTER TABLE `admin` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `menu` ADD COLUMN `category_id` INTEGER NULL,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `is_popular` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `menu_options` ADD COLUMN `allowMultiple` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `size` VARCHAR(191) NULL,
    ADD COLUMN `spicy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `has_slip` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `restaurant_data` ADD COLUMN `restaurant_address` VARCHAR(191) NULL,
    ADD COLUMN `restaurant_cover` VARCHAR(191) NULL,
    ADD COLUMN `restaurant_desc` VARCHAR(191) NULL,
    ADD COLUMN `restaurant_phone` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `restaurant_users` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `table_qrcode` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `zone_tables` ADD COLUMN `capacity` INTEGER NOT NULL DEFAULT 4,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'empty';

-- AddForeignKey
ALTER TABLE `menu` ADD CONSTRAINT `menu_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `menu_categories`(`category_id`) ON DELETE SET NULL ON UPDATE CASCADE;
