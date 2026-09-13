/*
  Warnings:

  - Added the required column `restaurantId` to the `menu_categories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `menu_categories` ADD COLUMN `restaurantId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `zone_object` ADD COLUMN `color` VARCHAR(191) NULL,
    ADD COLUMN `height` INTEGER NULL DEFAULT 80,
    ADD COLUMN `rotation` INTEGER NULL DEFAULT 0,
    ADD COLUMN `width` INTEGER NULL DEFAULT 80;

-- AlterTable
ALTER TABLE `zone_tables` ADD COLUMN `color` VARCHAR(191) NULL,
    ADD COLUMN `height` INTEGER NULL DEFAULT 80,
    ADD COLUMN `rotation` INTEGER NULL DEFAULT 0,
    ADD COLUMN `shape` VARCHAR(191) NULL DEFAULT 'square',
    ADD COLUMN `width` INTEGER NULL DEFAULT 80,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'available';

-- AddForeignKey
ALTER TABLE `menu_categories` ADD CONSTRAINT `menu_categories_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurant_data`(`res_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
