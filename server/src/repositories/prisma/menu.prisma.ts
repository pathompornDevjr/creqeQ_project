/**
 * Menu Prisma Repository Implementation
 * คลาสสำหรับจัดการฐานข้อมูลเมนูอาหารผ่าน Prisma ORM
 */

import prisma from "../../database/prisma";
import { IMenuRepository, MenuDTO } from "../interfaces/menu.repository.interface";

export class MenuPrismaRepository implements IMenuRepository {
  /**
   * ดึงรายการเมนูทั้งหมดของร้านอาหาร พร้อมหมวดหมู่และรูปภาพ
   * 
   * @param restaurantId รหัสร้านค้า
   * @returns รายการเมนูทั้งหมด
   */
  async findMany(restaurantId: number): Promise<any[]> {
    return prisma.menu.findMany({
      where: { restaurantId },
      include: {
        category: true, // รวมข้อมูลหมวดหมู่
        images: true,   // รวมรูปภาพเมนู
      },
    });
  }

  /**
   * ค้นหาเมนูอาหารตามรหัสเมนู (menu_id)
   * 
   * @param menuId รหัสเมนูอาหาร
   * @returns ข้อมูลเมนู หรือ null หากไม่พบ
   */
  async findById(menuId: number): Promise<any | null> {
    return prisma.menu.findUnique({
      where: { menu_id: menuId },
      include: {
        category: true,
        images: true,
      },
    });
  }

  /**
   * สร้างรายการเมนูอาหารใหม่ในฐานข้อมูล
   * 
   * @param data ข้อมูลเมนูที่จะสร้าง
   * @returns ข้อมูลเมนูที่ถูกบันทึกลงฐานข้อมูลแล้ว
   */
  async create(data: MenuDTO): Promise<any> {
    return prisma.menu.create({
      data: {
        restaurantId: data.restaurantId,
        menu_name: data.menu_name || "เมนูเครป",
        description: data.description || null,
        price: data.price || 0,
        is_available: data.is_available ?? data.is_availabel ?? true,
        is_popular: !!data.is_popular,
        category_id: data.category_id || null,
      },
    });
  }

  /**
   * แก้ไขและอัปเดตข้อมูลเมนูอาหาร
   * 
   * @param menuId รหัสเมนูอาหาร
   * @param data ข้อมูลที่ต้องการอัปเดต
   * @returns ข้อมูลเมนูหลังการอัปเดต
   */
  async update(menuId: number, data: Partial<MenuDTO>): Promise<any> {
    const updateData: any = {};
    if (data.menu_name !== undefined && data.menu_name !== null) updateData.menu_name = data.menu_name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.is_available !== undefined) updateData.is_available = data.is_available;
    else if (data.is_availabel !== undefined) updateData.is_available = data.is_availabel;
    if (data.is_popular !== undefined) updateData.is_popular = data.is_popular;
    if (data.category_id !== undefined) updateData.category_id = data.category_id;

    return prisma.menu.update({
      where: { menu_id: menuId },
      data: updateData,
    });
  }

  /**
   * ลบรายการเมนูอาหารออกจากฐานข้อมูล
   * 
   * @param menuId รหัสเมนูอาหาร
   * @returns true เมื่อลบสำเร็จ
   */
  async delete(menuId: number): Promise<boolean> {
    await prisma.menu.delete({
      where: { menu_id: menuId },
    });
    return true;
  }
}
