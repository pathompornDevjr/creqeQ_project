/**
 * Menu Service Layer
 * ให้บริการทางธุรกิจเกี่ยวกับการจัดการเมนูอาหาร (ดึงรายการ, ค้นหา, สร้าง, แก้ไข และลบ)
 */

import { MenuRepositoryFactory } from "../repositories";
import { MenuDTO } from "../repositories/interfaces/menu.repository.interface";

export class MenuService {
  private repository = MenuRepositoryFactory.getRepository();

  /** ดึงรายการเมนูทั้งหมดของร้านค้า */
  async getMenusByRestaurant(restaurantId: number) {
    return this.repository.findMany(restaurantId);
  }

  /** ดึงข้อมูลเมนูตาม ID */
  async getMenuById(menuId: number) {
    return this.repository.findById(menuId);
  }

  /** สร้างรายการเมนูใหม่ พร้อมตรวจสอบความถูกต้องของฟิลด์บังคับ */
  async createMenu(data: MenuDTO) {
    if (!data.restaurantId || !data.menu_name) {
      throw new Error("restaurantId and menu_name are required");
    }
    return this.repository.create(data);
  }

  /** แก้ไขและอัปเดตข้อมูลเมนูอาหาร */
  async updateMenu(menuId: number, data: Partial<MenuDTO>) {
    return this.repository.update(menuId, data);
  }

  /** ลบรายการเมนูอาหาร */
  async deleteMenu(menuId: number) {
    return this.repository.delete(menuId);
  }
}
