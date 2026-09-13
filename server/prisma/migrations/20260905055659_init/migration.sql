/*
  Warnings:

  - You are about to drop the column `menu_options_id` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `facebook` on the `restaurant_users` table. All the data in the column will be lost.
  - You are about to drop the column `lineId` on the `restaurant_users` table. All the data in the column will be lost.
  - Added the required column `order_item_id` to the `menu_option_orderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `menu` DROP FOREIGN KEY `menu_restaurantId_fkey`;

-- DropForeignKey
ALTER TABLE `menu_categories` DROP FOREIGN KEY `menu_categories_restaurantId_fkey`;

-- DropForeignKey
ALTER TABLE `menu_images` DROP FOREIGN KEY `menu_images_menu_id_fkey`;

-- DropForeignKey
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_menu_id_fkey`;

-- DropForeignKey
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_menu_options_id_fkey`;

-- DropForeignKey
ALTER TABLE `order_items` DROP FOREIGN KEY `order_items_order_id_fkey`;

-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `orders_restaurant_id_fkey`;

-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_order_id_fkey`;

-- DropForeignKey
ALTER TABLE `restaurant_paid` DROP FOREIGN KEY `restaurant_paid_restaurant_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `restaurant_users` DROP FOREIGN KEY `restaurant_users_restaurantId_fkey`;

-- DropForeignKey
ALTER TABLE `restaurant_zone` DROP FOREIGN KEY `restaurant_zone_restaurantId_fkey`;

-- DropForeignKey
ALTER TABLE `table_qrcode` DROP FOREIGN KEY `table_qrcode_tableId_fkey`;

-- DropForeignKey
ALTER TABLE `zone_object` DROP FOREIGN KEY `zone_object_zoneId_fkey`;

-- DropForeignKey
ALTER TABLE `zone_tables` DROP FOREIGN KEY `zone_tables_zoneId_fkey`;

-- DropIndex
DROP INDEX `order_items_menu_id_key` ON `order_items`;

-- DropIndex
DROP INDEX `order_items_menu_options_id_key` ON `order_items`;

-- AlterTable
ALTER TABLE `menu_option_orderitem` ADD COLUMN `order_item_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `order_items` DROP COLUMN `menu_options_id`,
    ADD COLUMN `menu_name` VARCHAR(191) NULL,
    MODIFY `menu_status` VARCHAR(191) NULL DEFAULT 'available';

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `device_id` VARCHAR(191) NULL,
    ADD COLUMN `slip_url` TEXT NULL;

-- AlterTable
ALTER TABLE `restaurant_data` ADD COLUMN `bank_account_name` VARCHAR(191) NULL,
    ADD COLUMN `bank_account_number` VARCHAR(191) NULL,
    ADD COLUMN `bank_name` VARCHAR(191) NULL,
    ADD COLUMN `facebook_url` VARCHAR(191) NULL,
    ADD COLUMN `instagram_url` VARCHAR(191) NULL,
    ADD COLUMN `line_id` VARCHAR(191) NULL,
    ADD COLUMN `promptpay_name` VARCHAR(191) NULL,
    ADD COLUMN `promptpay_number` VARCHAR(191) NULL,
    ADD COLUMN `promptpay_qr` TEXT NULL,
    ADD COLUMN `qrpayment_url` VARCHAR(191) NULL,
    ADD COLUMN `tiktok_url` VARCHAR(191) NULL,
    ADD COLUMN `website_url` VARCHAR(191) NULL,
    MODIFY `restaurant_other_theme` TEXT NULL,
    MODIFY `restaurant_address` TEXT NULL;

-- AlterTable
ALTER TABLE `restaurant_paid` ADD COLUMN `remark` VARCHAR(191) NULL,
    MODIFY `slip_url` TEXT NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE `restaurant_users` DROP COLUMN `facebook`,
    DROP COLUMN `lineId`,
    ADD COLUMN `status` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `restaurant_zone` MODIFY `remark` VARCHAR(191) NULL DEFAULT '';

-- CreateIndex
CREATE INDEX `admin_phone_idx` ON `admin`(`phone`);

-- CreateIndex
CREATE INDEX `admin_email_idx` ON `admin`(`email`);

-- CreateIndex
CREATE INDEX `menu_is_availabel_idx` ON `menu`(`is_availabel`);

-- CreateIndex
CREATE INDEX `menu_is_popular_idx` ON `menu`(`is_popular`);

-- CreateIndex
CREATE INDEX `menu_option_orderItem_order_item_id_idx` ON `menu_option_orderItem`(`order_item_id`);

-- CreateIndex
CREATE INDEX `menu_options_menu_id_idx` ON `menu_options`(`menu_id`);

-- CreateIndex
CREATE INDEX `order_items_menu_id_idx` ON `order_items`(`menu_id`);

-- CreateIndex
CREATE INDEX `orders_table_id_idx` ON `orders`(`table_id`);

-- CreateIndex
CREATE INDEX `orders_order_status_idx` ON `orders`(`order_status`);

-- CreateIndex
CREATE INDEX `orders_createdAt_idx` ON `orders`(`createdAt`);

-- CreateIndex
CREATE INDEX `payments_status_idx` ON `payments`(`status`);

-- CreateIndex
CREATE INDEX `restaurant_data_is_open_idx` ON `restaurant_data`(`is_open`);

-- CreateIndex
CREATE INDEX `restaurant_data_restaurant_name_idx` ON `restaurant_data`(`restaurant_name`);

-- CreateIndex
CREATE INDEX `restaurant_paid_status_idx` ON `restaurant_paid`(`status`);

-- CreateIndex
CREATE INDEX `restaurant_paid_is_active_idx` ON `restaurant_paid`(`is_active`);

-- CreateIndex
CREATE INDEX `restaurant_users_email_idx` ON `restaurant_users`(`email`);

-- CreateIndex
CREATE INDEX `restaurant_users_phone_idx` ON `restaurant_users`(`phone`);

-- CreateIndex
CREATE INDEX `restaurant_users_status_idx` ON `restaurant_users`(`status`);

-- CreateIndex
CREATE INDEX `zone_tables_table_token_idx` ON `zone_tables`(`table_token`);

-- CreateIndex
CREATE INDEX `zone_tables_status_idx` ON `zone_tables`(`status`);

-- AddForeignKey
ALTER TABLE `restaurant_users` ADD CONSTRAINT `restaurant_users_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurant_data`(`res_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_categories` ADD CONSTRAINT `menu_categories_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurant_data`(`res_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu` ADD CONSTRAINT `menu_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurant_data`(`res_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_images` ADD CONSTRAINT `menu_images_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `menu`(`menu_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_paid` ADD CONSTRAINT `restaurant_paid_restaurant_user_id_fkey` FOREIGN KEY (`restaurant_user_id`) REFERENCES `restaurant_users`(`res_user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_zone` ADD CONSTRAINT `restaurant_zone_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurant_data`(`res_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zone_tables` ADD CONSTRAINT `zone_tables_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `restaurant_zone`(`zone_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `table_qrcode` ADD CONSTRAINT `table_qrcode_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `zone_tables`(`table_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zone_object` ADD CONSTRAINT `zone_object_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `restaurant_zone`(`zone_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurant_data`(`res_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_option_orderItem` ADD CONSTRAINT `menu_option_orderItem_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`item_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `admin` RENAME INDEX `admin_roleId_fkey` TO `admin_roleId_idx`;

-- RenameIndex
ALTER TABLE `menu` RENAME INDEX `menu_category_id_fkey` TO `menu_category_id_idx`;

-- RenameIndex
ALTER TABLE `menu` RENAME INDEX `menu_restaurantId_fkey` TO `menu_restaurantId_idx`;

-- RenameIndex
ALTER TABLE `menu_categories` RENAME INDEX `menu_categories_restaurantId_fkey` TO `menu_categories_restaurantId_idx`;

-- RenameIndex
ALTER TABLE `menu_images` RENAME INDEX `menu_images_menu_id_fkey` TO `menu_images_menu_id_idx`;

-- RenameIndex
ALTER TABLE `menu_option_orderitem` RENAME INDEX `menu_option_orderItem_menuOption_id_fkey` TO `menu_option_orderItem_menuOption_id_idx`;

-- RenameIndex
ALTER TABLE `order_items` RENAME INDEX `order_items_order_id_fkey` TO `order_items_order_id_idx`;

-- RenameIndex
ALTER TABLE `orders` RENAME INDEX `orders_restaurant_id_fkey` TO `orders_restaurant_id_idx`;

-- RenameIndex
ALTER TABLE `restaurant_paid` RENAME INDEX `restaurant_paid_restaurant_user_id_fkey` TO `restaurant_paid_restaurant_user_id_idx`;

-- RenameIndex
ALTER TABLE `restaurant_users` RENAME INDEX `restaurant_users_restaurantId_fkey` TO `restaurant_users_restaurantId_idx`;

-- RenameIndex
ALTER TABLE `restaurant_users` RENAME INDEX `restaurant_users_roleId_fkey` TO `restaurant_users_roleId_idx`;

-- RenameIndex
ALTER TABLE `restaurant_zone` RENAME INDEX `restaurant_zone_restaurantId_fkey` TO `restaurant_zone_restaurantId_idx`;

-- RenameIndex
ALTER TABLE `zone_object` RENAME INDEX `zone_object_zoneId_fkey` TO `zone_object_zoneId_idx`;

-- RenameIndex
ALTER TABLE `zone_tables` RENAME INDEX `zone_tables_zoneId_fkey` TO `zone_tables_zoneId_idx`;
