/**
 * สัญญาระบบจัดการเมนูพื้นฐาน (Menu Repository Interfaces & DTOs)
 * กำหนดโครงสร้างข้อมูลและฟังก์ชันสำหรับการจัดการรายการอาหาร
 */

/**
 * โครงสร้างข้อมูลเมนูอาหารสำหรับสร้างหรือแก้ไข (Menu DTO)
 */
export interface MenuDTO {
  restaurantId: number;      // รหัสร้านค้าเจ้าของเมนู
  menu_name: string;         // ชื่อเมนูอาหาร
  description?: string | null;// รายละเอียดเมนู
  price?: number;            // ราคา
  is_available?: boolean;    // สถานะพร้อมจำหน่ายหรือไม่
  is_availabel?: boolean;    // ฟิลด์สำรองสำหรับ backward compatibility
  is_popular?: boolean;      // เครื่องหมายเมนูยอดนิยม (แนะนำ)
  category_id?: number | null;// รหัสหมวดหมู่อาหาร
}

/**
 * Interface สำหรับ Menu Repository
 */
export interface IMenuRepository {
  /** ดึงรายการเมนูทั้งหมดของร้านค้านั้นๆ */
  findMany(restaurantId: number): Promise<any[]>;

  /** ค้นหาเมนูอาหารตามรหัสเมนู (ID) */
  findById(menuId: number): Promise<any | null>;

  /** สร้างรายการเมนูใหม่ */
  create(data: MenuDTO): Promise<any>;

  /** อัปเดตข้อมูลเมนูอาหาร */
  update(menuId: number, data: Partial<MenuDTO>): Promise<any>;

  /** ลบรายการเมนูอาหาร */
  delete(menuId: number): Promise<boolean>;
}
