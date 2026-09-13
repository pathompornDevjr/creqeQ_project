-- CreateTable
CREATE TABLE `role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rolename` VARCHAR(191) NOT NULL,
    `craetedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin` (
    `user_id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fname` VARCHAR(191) NOT NULL,
    `lname` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `roleId` INTEGER NOT NULL,

    UNIQUE INDEX `admin_username_key`(`username`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_users` (
    `res_user_id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fname` VARCHAR(191) NOT NULL,
    `lname` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `facebook` VARCHAR(191) NULL,
    `lineId` VARCHAR(191) NULL,
    `roleId` INTEGER NOT NULL,
    `restaurantId` INTEGER NOT NULL,

    PRIMARY KEY (`res_user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_data` (
    `res_id` INTEGER NOT NULL AUTO_INCREMENT,
    `restaurant_name` VARCHAR(191) NOT NULL,
    `restaurant_lat` VARCHAR(191) NULL,
    `restaurant_long` VARCHAR(191) NULL,
    `restaurant_logo` VARCHAR(191) NULL,
    `restaurant_primary_theme` VARCHAR(191) NULL,
    `restaurant_secondary_theme` VARCHAR(191) NULL,
    `restaurant_other_theme` VARCHAR(191) NULL,
    `restaurant_open_time` VARCHAR(191) NULL,
    `restaurant_close_time` VARCHAR(191) NULL,
    `restaurant_day` VARCHAR(191) NULL,
    `is_open` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`res_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_categories` (
    `category_id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_name` VARCHAR(191) NULL,
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu` (
    `menu_id` INTEGER NOT NULL AUTO_INCREMENT,
    `restaurantId` INTEGER NOT NULL,
    `menu_name` VARCHAR(191) NULL,
    `price` INTEGER NOT NULL DEFAULT 0,
    `is_availabel` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`menu_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_images` (
    `image_id` INTEGER NOT NULL AUTO_INCREMENT,
    `image_url` VARCHAR(191) NULL,
    `menu_id` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`image_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_options` (
    `menu_options_id` INTEGER NOT NULL AUTO_INCREMENT,
    `menu_id` INTEGER NOT NULL,
    `option_name` VARCHAR(191) NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `choices` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`menu_options_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_paid` (
    `paid_id` VARCHAR(191) NOT NULL,
    `plan` VARCHAR(191) NOT NULL,
    `slip_url` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `restaurant_user_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`paid_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_zone` (
    `zone_id` INTEGER NOT NULL AUTO_INCREMENT,
    `zone_name` VARCHAR(191) NULL,
    `remark` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `restaurantId` INTEGER NOT NULL,

    PRIMARY KEY (`zone_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zone_tables` (
    `table_id` INTEGER NOT NULL AUTO_INCREMENT,
    `table_name` VARCHAR(191) NOT NULL,
    `remark` VARCHAR(191) NULL,
    `position_x` VARCHAR(191) NULL,
    `position_y` VARCHAR(191) NULL,
    `table_token` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `zoneId` INTEGER NOT NULL,

    PRIMARY KEY (`table_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `table_qrcode` (
    `qrcode_id` INTEGER NOT NULL AUTO_INCREMENT,
    `qrcode_token` VARCHAR(191) NULL,
    `qrcode_url` VARCHAR(191) NULL,
    `qrcode_remark` VARCHAR(191) NULL,
    `tableId` INTEGER NULL,

    UNIQUE INDEX `table_qrcode_tableId_key`(`tableId`),
    PRIMARY KEY (`qrcode_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `zone_object` (
    `object_id` INTEGER NOT NULL AUTO_INCREMENT,
    `object_name` VARCHAR(191) NOT NULL,
    `remark` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'toilet',
    `position_x` VARCHAR(191) NULL,
    `position_y` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `zoneId` INTEGER NOT NULL,

    PRIMARY KEY (`object_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `order_id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `restaurant_id` INTEGER NOT NULL,
    `table_id` INTEGER NOT NULL,
    `payment_method` VARCHAR(191) NULL,
    `payment_status` VARCHAR(191) NULL,
    `total` INTEGER NOT NULL DEFAULT 0,
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `complatedAt` DATETIME(3) NULL,

    PRIMARY KEY (`order_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `menu_id` INTEGER NOT NULL,
    `menu_status` VARCHAR(191) NULL DEFAULT 'avaliable',
    `price` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `menu_options_id` INTEGER NULL,
    `remark` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `order_items_menu_id_key`(`menu_id`),
    UNIQUE INDEX `order_items_menu_options_id_key`(`menu_options_id`),
    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_option_orderItem` (
    `option_order_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `options` VARCHAR(191) NULL,
    `menuOption_id` INTEGER NOT NULL,
    `price` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`option_order_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `payment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NULL,
    `amount` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NULL DEFAULT 'declined',
    `provider` VARCHAR(191) NULL,
    `paid_at` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payments_order_id_key`(`order_id`),
    PRIMARY KEY (`payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin` ADD CONSTRAINT `admin_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_users` ADD CONSTRAINT `restaurant_users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_users` ADD CONSTRAINT `restaurant_users_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurant_data`(`res_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu` ADD CONSTRAINT `menu_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurant_data`(`res_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_images` ADD CONSTRAINT `menu_images_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `menu`(`menu_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_paid` ADD CONSTRAINT `restaurant_paid_restaurant_user_id_fkey` FOREIGN KEY (`restaurant_user_id`) REFERENCES `restaurant_users`(`res_user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_zone` ADD CONSTRAINT `restaurant_zone_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurant_data`(`res_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zone_tables` ADD CONSTRAINT `zone_tables_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `restaurant_zone`(`zone_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `table_qrcode` ADD CONSTRAINT `table_qrcode_tableId_fkey` FOREIGN KEY (`tableId`) REFERENCES `zone_tables`(`table_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zone_object` ADD CONSTRAINT `zone_object_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `restaurant_zone`(`zone_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurant_data`(`res_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `menu`(`menu_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_menu_options_id_fkey` FOREIGN KEY (`menu_options_id`) REFERENCES `menu_option_orderItem`(`option_order_item_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_option_orderItem` ADD CONSTRAINT `menu_option_orderItem_menuOption_id_fkey` FOREIGN KEY (`menuOption_id`) REFERENCES `menu_options`(`menu_options_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE SET NULL ON UPDATE CASCADE;
