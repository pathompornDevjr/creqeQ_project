# เอกสารอธิบายโครงสร้างและการทำงานของระบบหลังบ้าน (Server Codebase Architecture)

เอกสารฉบับนี้จัดทำขึ้นเพื่ออธิบายโครงสร้าง โค้ดแต่ละโฟลเดอร์ และแต่ละไฟล์ของระบบเซิร์ฟเวอร์หลังบ้าน (Backend Server) ของระบบ CrepeQ อย่างละเอียด โดยมุ่งเน้นให้อ่านเข้าใจง่าย เห็นภาพรวมความสัมพันธ์ และระบุจุดที่ไฟล์แต่ละไฟล์ถูกเรียกใช้งานในระบบอย่างครบถ้วน

---

## 1. ภาพรวมสถาปัตยกรรมระบบหลังบ้าน (System Architecture Overview)

ระบบหลังบ้านของ CrepeQ พัฒนาขึ้นโดยใช้เทคโนโลยีหลักดังนี้:
- **Runtime Environment**: Bun (JavaScript/TypeScript runtime ประสิทธิภาพสูง)
- **Web Framework**: Elysia.js (Framework ที่มีความเร็วสูงบน Bun)
- **Database ORM**: Prisma ORM ร่วมกับ MariaDB Adapter
- **Database Engine**: MySQL / MariaDB (รองรับทั้งแบบ Localhost และ Cloud เช่น TiDB Cloud / Aiven)
- **Architecture Pattern**: แบ่งโครงสร้างตามหลัก 3-Tier Layered Architecture ผสมผสาน Repository Pattern:
  1. **Route Layer**: จัดการ HTTP Routing, Middleware, Validation และ Request Transformation
  2. **Controller Layer**: ควบคุม Flow การทำงาน แปลงข้อมูลระหว่าง Route และ Service
  3. **Service Layer**: จัดการ Business Logic, ตรรกะการประมวลผลคำสั่งซื้อ, คิว, การสแกนสลิปด้วย AI, การสร้างเสียง TTS และการแจ้งเตือน Realtime
  4. **Repository Layer**: จัดการการเชื่อมต่อและดึงข้อมูลจากฐานข้อมูลผ่าน Prisma โดยมี Interface เป็นตัวกลาง (Inversion of Control)

---

## 2. โครงสร้างโฟลเดอร์ทั้งหมดของระบบหลังบ้าน (Folder Hierarchy)

```
server/
├── prisma/                          # โฟลเดอร์นิยาม Schema และ Migration ของฐานข้อมูล
│   └── schema.prisma                # ไฟล์กำหนดโครงสร้างตารางและความสัมพันธ์ทั้งหมด
├── src/                             # โค้ดต้นฉบับภาษา TypeScript ของระบบเซิร์ฟเวอร์
│   ├── config/                      # โฟลเดอร์เก็บการตั้งค่าสภาพแวดล้อม (Environment Config)
│   ├── controllers/                 # โฟลเดอร์ Controller จัดการตรรกะระดับ HTTP Request
│   ├── database/                    # โฟลเดอร์สร้าง Connection Pool ของฐานข้อมูล Prisma
│   ├── libs/                        # โฟลเดอร์ Library ช่วยงานทั่วไป (JWT, Password, Guards)
│   ├── repositories/                # โฟลเดอร์ติดต่อฐานข้อมูล (Data Access Layer)
│   │   ├── interfaces/              # อินเตอร์เฟซกำหนดสัญญาระหว่าง Service และ Database
│   │   └── prisma/                  # การเขียนโค้ดค้นหา/บันทึกฐานข้อมูลจริงผ่าน Prisma
│   ├── routes/                      # โฟลเดอร์นิยาม API Endpoint เส้นทางต่างๆ ของ Elysia
│   ├── services/                    # โฟลเดอร์ Business Logic หลักของระบบ
│   └── index.ts                     # จุดเริ่มต้นหลักของเซิร์ฟเวอร์ (Entry Point)
├── uploads/                         # โฟลเดอร์จัดเก็บไฟล์มีเดียและรูปภาพที่อัปโหลด
│   ├── menus/                       # จัดเก็บรูปภาพเมนูเครปและท็อปปิ้ง
│   ├── qrcodes/                     # จัดเก็บรูป QR Code การชำระเงิน
│   └── slips/                       # จัดเก็บรูปภาพสลิปโอนเงินของลูกค้า
├── Dockerfile                       # การตั้งค่า Container สำหรับ Production Deployment
├── package.json                     # ไฟล์กำหนด Dependencies และ Script คำสั่งรันระบบ
├── prisma.config.ts                 # ไฟล์ตั้งค่าการเชื่อมต่อของ Prisma
└── tsconfig.json                    # ไฟล์ตั้งค่า Compiler ของ TypeScript
```

---

## 3. คำอธิบายรายละเอียดของแต่ละโฟลเดอร์ (Directory Breakdown)

### 3.1 `server/prisma/`
- **หน้าที่และความสำคัญ**: จัดเก็บโครงสร้าง Schema ของฐานข้อมูล Prisma และประวัติการ Migration โครงสร้างตาราง
- **การทำงาน**: ใช้สำหรับแปลงนิยามข้อมูลจากภาษา Prisma Schema ให้ออกมาเป็นโค้ด TypeScript Client สำหรับสืบค้นข้อมูลในฐานข้อมูล MySQL/MariaDB

### 3.2 `server/src/config/`
- **หน้าที่และความสำคัญ**: จัดการค่าคอนฟิกูเรชันและการตรวจสอบความถูกต้องของตัวแปรสภาพแวดล้อม (.env)
- **การทำงาน**: ดึงค่า Port, Database URL, Secret Key, API Key เพื่อส่งมอบให้กับโมดูลต่างๆ ใช้งานอย่างปลอดภัย

### 3.3 `server/src/database/`
- **หน้าที่และความสำคัญ**: จัดการ Connection Pool สำหรับเชื่อมต่อกับฐานข้อมูล
- **การทำงาน**: ปรับแต่งการเชื่อมต่อ SSL สำหรับ Cloud Database (TiDB/Aiven) และทำหน้าที่เป็นตัวแทน Instance เดียว (Singleton) สำหรับ Prisma Client

### 3.4 `server/src/libs/`
- **หน้าที่และความสำคัญ**: จัดเก็บ Utility Functions และ Middleware กลางที่ใช้ซ้ำในหลายส่วน
- **การทำงาน**: มีทั้งระบบตรวจสอบ JWT Token, การเข้ารหัสผ่าน bcrypt, การตรวจ API Key, การจัดรูปแบบตัวเลข และการจัดการที่อยู่ภาษาไทย

### 3.5 `server/src/routes/`
- **หน้าที่และความสำคัญ**: กำหนดเส้นทาง URL Endpoint ของเซิร์ฟเวอร์ Elysia
- **การทำงาน**: จัดกลุ่ม Endpoint เป็นหมวดหมู่ เช่น `/api/v1/restaurant`, `/api/v1/customer`, `/api/v1/menu`, `/api/v1/auth`, `/api/v1/realtime` แล้วส่งต่อข้อมูลไปยัง Controller

### 3.6 `server/src/controllers/`
- **หน้าที่และความสำคัญ**: รับ Input จาก Route ตรวจสอบความถูกต้องเบื้องต้น แล้วเรียกใช้ Service ที่เกี่ยวข้อง
- **การทำงาน**: ควบคุม Response Code (200, 400, 404, 500) และแปลงโครงสร้างข้อมูลให้ได้มาตรฐานสากลก่อนส่งกลับให้ไคลเอนต์

### 3.7 `server/src/services/`
- **หน้าที่และความสำคัญ**: เป็นหัวใจหลักของระบบ (Core Business Logic)
- **การทำงาน**: ดำเนินการตามกฎทางธุรกิจ เช่น การคำนวณราคาเครปและท็อปปิ้ง, การออกหมายเลขคิว, การประมวลผลรูปสลิปด้วย Google Gemini AI, การสร้างเสียงภาษาไทย (TTS), การสร้าง PromptPay QR และการส่งข้อความ Server-Sent Events

### 3.8 `server/src/repositories/`
- **หน้าที่และความสำคัญ**: Data Access Layer สำหรับแยกตรรกะฐานข้อมูลออกจาก Business Logic
- **การทำงาน**: แบ่งออกเป็น Interfaces (โครงสร้างมาตรฐาน) และ Prisma Implementations (คำสั่ง SQL/Prisma จริง) โดยเชื่อมโยงผ่าน Repository Factories

### 3.9 `server/uploads/`
- **หน้าที่และความสำคัญ**: ที่จัดเก็บไฟล์ Static Assets ที่อัปโหลดเข้ามาในเครื่องเซิร์ฟเวอร์
- **การทำงาน**: จัดเก็บรูปภาพเมนู, สลิปโอนเงิน และ QR Code พร้อมให้บริการผ่าน Endpoint `/uploads/*`

---

## 4. คำอธิบายการทำงานของไฟล์อย่างละเอียด (File-by-File Breakdown)

---

### กลุ่มไฟล์ที่ 1: ไฟล์รากและไฟล์การตั้งค่าระบบ (Root & Configuration Files)

#### 1. `server/src/index.ts`
- **หน้าที่การทำงาน**:
  - เป็นจุดเริ่มต้นหลัก (Entry Point) ในการบูตระบบเซิร์ฟเวอร์ Elysia
  - ตั้งค่า CORS (Cross-Origin Resource Sharing) เพื่อให้แอปพลิเคชัน Frontend เข้าถึงได้
  - ตั้งค่า Security Headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
  - ติดตั้ง Middleware จำกัดอัตราการเรียกใช้งาน (Rate Limiting 600 คำขอต่อนาทีต่อ IP)
  - กำหนด Global Error Handler จัดการดักจับข้อผิดพลาดทั่วทั้งระบบ
  - เปิดบริการ Static File Route สำหรับโฟลเดอร์ `/uploads/*`
  - ลงทะเบียน API Routes เวอร์ชัน 1 (`/api/v1/*`)
  - รันฟังก์ชัน `ensureDefaultShop()` สำหรับตรวจสอบและสร้างข้อมูลร้านค้าเริ่มต้นและแอดมินอัตโนมัติหากฐานข้อมูลยังว่างเปล่า
- **ถูกเรียกใช้งานโดย**:
  - ถูกรันโดยตรงจากคำสั่ง `bun run dev` หรือ `bun src/index.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ (Dependencies)**:
  - `src/routes/menu.route.ts`
  - `src/routes/restaurant.route.ts`
  - `src/routes/customer.route.ts`
  - `src/routes/auth.route.ts`
  - `src/routes/realtime.route.ts`
  - `src/routes/tts.route.ts`
  - `src/routes/payment.route.ts`
  - `src/database/prisma.ts`
  - `src/libs/apiKeyGuard.ts`
  - `src/libs/password.ts`

#### 2. `server/prisma/schema.prisma`
- **หน้าที่การทำงาน**:
  - นิยามโครงสร้างฐานข้อมูล (Database Schema) ทั้งหมด 12 ตารางหลัก
  - กำหนดความสัมพันธ์ (Relations) แบบ One-to-Many และ One-to-One
  - ตารางหลักประกอบด้วย:
    - `customers`: ข้อมูลลูกค้า (ชื่อเล่น, เบอร์โทร)
    - `restaurant_users`: ผู้ใช้งานฝั่งร้านค้า (เจ้าของร้าน, พนักงาน)
    - `restaurant_data`: ข้อมูลโปรไฟล์ร้านค้า, การตั้งค่าการเปิด-ปิดร้าน, ธีมสี, ช่องทางติดต่อ, บัญชีธนาคาร/PromptPay
    - `menu_categories`: หมวดหมู่อาหาร/เครป
    - `menu`: รายการเมนูเครปและเครื่องดื่ม
    - `menu_images`: รูปภาพประกอบเพิ่มเติมของเมนู
    - `menu_options`: ตัวเลือกเพิ่มเติม (แป้ง, ไส้, ซอส, ท็อปปิ้ง)
    - `crepe_crusts`: รายการแป้งเครปและราคา
    - `sample_menus`: เมนูตัวอย่างแนะนำสำหรับแสดงผลในหน้าแรก
    - `orders`: คำสั่งซื้อ, เลขคิว, สถานะการทำอาหาร, สถานะการชำระเงิน, เวลานัดรับ
    - `order_items`: รายการอาหารย่อยภายในแต่ละออเดอร์
    - `menu_option_orderItem`: ตัวเลือกและท็อปปิ้งที่ลูกค้าเลือกในแต่ละเมนู
    - `payments`: ธุรกรรมการชำระเงิน, ลิงก์สลิป, ผลการตรวจสอบสลิป
    - `inventory_items`: วัตถุดิบในคลังและสถานะของหมด
- **ถูกเรียกใช้งานโดย**:
  - Prisma CLI (`prisma generate`, `prisma db push`, `prisma migrate`)
  - `src/database/prisma.ts` (ผ่าน Client ที่ถูกสร้างขึ้น)
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 3. `server/src/database/prisma.ts`
- **หน้าที่การทำงาน**:
  - สร้างและส่งออก Prisma Client Instance แบบ Singleton เพื่อใช้ทั่วทั้งระบบ
  - มีการ Patch TLS Socket บน Windows สำหรับการทำงานร่วมกับไดรเวอร์ MariaDB
  - มีฟังก์ชัน `getDatabaseConfig()` แยกค่า `DATABASE_URL` และตั้งค่า Connection Pool (connectionLimit, timeouts, ssl) สำหรับรองรับ Cloud Database (TiDB / Aiven)
- **ถูกเรียกใช้งานโดย**:
  - `src/index.ts`
  - `src/repositories/prisma/admin.prisma.ts`
  - `src/repositories/prisma/auth.prisma.ts`
  - `src/repositories/prisma/customer.prisma.ts`
  - `src/repositories/prisma/menu.prisma.ts`
  - `src/repositories/prisma/restaurant.prisma.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/generated/prisma` (Prisma Client Bundle)

#### 4. `server/src/config/env.config.ts`
- **หน้าที่การทำงาน**:
  - รวบรวมค่า Config จากตัวแปรสภาพแวดล้อม (Environment Variables) เช่น พอร์ต, คีย์ลับ JWT, API Key สำหรับตรวจสอบคำขอ, คีย์เชื่อมต่อ Gemini AI, คีย์เชื่อมต่อ Redis
- **ถูกเรียกใช้งานโดย**:
  - `src/libs/jwt.ts`
  - `src/libs/apiKeyGuard.ts`
  - `src/services/gemini-slip.service.ts`
  - `src/services/redis.service.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 5. `server/prisma.config.ts`
- **หน้าที่การทำงาน**:
  - กำหนดการตั้งค่าสำหรับการเรียกใช้งานคำสั่ง Prisma ภายในโปรเจกต์
- **ถูกเรียกใช้งานโดย**:
  - Prisma CLI
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 6. `server/package.json`
- **หน้าที่การทำงาน**:
  - กำหนด Dependencies ของเซิร์ฟเวอร์ (Elysia, Prisma, Google GenAI, JWT, Multer, ฯลฯ) และ Scripts สำหรับการรัน Development, Build และ Migrate
- **ถูกเรียกใช้งานโดย**:
  - Bun / Node.js Package Manager
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 7. `server/tsconfig.json`
- **หน้าที่การทำงาน**:
  - กำหนดกฎระเบียบในการแปลผล TypeScript (เช่น Target ESNext, ModuleResolution, Path Aliases)
- **ถูกเรียกใช้งานโดย**:
  - TypeScript Compiler / Bun Runtime
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 8. `server/Dockerfile`
- **หน้าที่การทำงาน**:
  - สคริปต์สร้าง Docker Container Image สำหรับรันเซิร์ฟเวอร์ Bun ในสภาวะแวดล้อมจริง
- **ถูกเรียกใช้งานโดย**:
  - Docker Engine / CI/CD Deployment Pipeline
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

---

### กลุ่มไฟล์ที่ 2: ไลบรารีและมิดเดิลแวร์ (Libraries & Middleware)

#### 9. `server/src/libs/apiKeyGuard.ts`
- **หน้าที่การทำงาน**:
  - ทำหน้าที่เป็น Security Middleware ตรวจสอบค่า Header `x-api-key` หรือ `X-Api-Key` หรือ Query Parameter `apiKey` ของทุกคำขอที่เข้ามายังกลุ่ม `/api/v1`
  - ป้องกันการยิง API ตรงจากแหล่งภายนอกที่ไม่ได้รับอนุญาต
- **ถูกเรียกใช้งานโดย**:
  - `src/index.ts` (ใช้ใน `.group("/api/v1", ...)`)
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/config/env.config.ts`

#### 10. `server/src/libs/authGuard.ts`
- **หน้าที่การทำงาน**:
  - ทำหน้าที่เป็น Authentication Middleware ตรวจสอบความถูกต้องของ JWT Token ใน Header `Authorization: Bearer <token>` หรือ Cookie `auth_token`
  - ตรวจสอบสิทธิ์และบทบาทของผู้ใช้งาน (Role Guard เช่น owner, staff, admin) ก่อนอนุญาตให้เข้าถึง API จัดการร้านค้า
- **ถูกเรียกใช้งานโดย**:
  - `src/routes/restaurant.route.ts`
  - `src/routes/admin.route.ts`
  - `src/routes/menu.route.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/libs/jwt.ts`

#### 11. `server/src/libs/jwt.ts`
- **หน้าที่การทำงาน**:
  - ฟังก์ชันสำหรับสร้าง (Sign) และถอดรหัสตรวจสอบ (Verify) JSON Web Token (JWT)
  - บรรจุข้อมูล User ID, Role, Restaurant ID ลงใน Token Payload
- **ถูกเรียกใช้งานโดย**:
  - `src/services/auth.service.ts`
  - `src/libs/authGuard.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/config/env.config.ts`

#### 12. `server/src/libs/password.ts`
- **หน้าที่การทำงาน**:
  - ฟังก์ชันสำหรับเข้ารหัสรหัสผ่าน (`hashPassword`) และตรวจสอบรหัสผ่าน (`verifyPassword`) โดยใช้กลไกการแฮชที่ปลอดภัย (bcrypt/Bun password hashing)
- **ถูกเรียกใช้งานโดย**:
  - `src/index.ts` (สร้างรหัสผ่านเริ่มต้นของแอดมิน)
  - `src/services/auth.service.ts`
  - `src/repositories/prisma/auth.prisma.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 13. `server/src/libs/format.ts`
- **หน้าที่การทำงาน**:
  - ฟังก์ชันจัดรูปแบบข้อมูล เช่น การจัดรูปแบบเบอร์โทรศัพท์, การจัดรูปแบบวันที่และเวลาตามมาตรฐานไทย, และการจัดรูปแบบยอดเงินทศนิยม
- **ถูกเรียกใช้งานโดย**:
  - `src/services/customer.service.ts`
  - `src/services/restaurant.service.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 14. `server/src/libs/thai-address.ts`
- **หน้าที่การทำงาน**:
  - ฟังก์ชันช่วยแยกแยะและตรวจสอบข้อมูลที่อยู่ภาษาไทย (ตำบล, อำเภอ, จังหวัด, รหัสไปรษณีย์)
- **ถูกเรียกใช้งานโดย**:
  - `src/services/restaurant.service.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

---

### กลุ่มไฟล์ที่ 3: เส้นทางคำขอ (API Routes)

#### 15. `server/src/routes/auth.route.ts`
- **หน้าที่การทำงาน**:
  - นิยาม Endpoint เกี่ยวกับการยืนยันตัวตนของผู้ดูแลและพนักงานร้านค้า
  - `/auth/login` (POST): เข้าสู่ระบบร้านค้า
  - `/auth/register` (POST): ลงทะเบียนร้านค้าใหม่
  - `/auth/me` (GET): ดึงข้อมูลโปรไฟล์ผู้ใช้งานปัจจุบัน
  - `/auth/logout` (POST): ออกจากระบบ
- **ถูกเรียกใช้งานโดย**:
  - `src/index.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/controllers/auth.controller.ts`

#### 16. `server/src/routes/customer.route.ts`
- **หน้าที่การทำงาน**:
  - นิยาม Endpoint สำหรับฝั่งลูกค้าทั้งหมด:
    - `/customer/table-info` (GET): ตรวจสอบสถานะร้านและข้อมูลโต๊ะ
    - `/customer/categories` (GET): ดึงหมวดหมู่สินค้า
    - `/customer/crusts` (GET): ดึงรายการแป้งเครป
    - `/customer/sample-menus` (GET): ดึงเมนูตัวอย่างหน้าแรก
    - `/customer/menus` (GET): ค้นหาและดึงรายการเมนู
    - `/customer/login` (POST): เข้าสู่ระบบลูกค้าด้วยเบอร์โทร
    - `/customer/orders` (POST): ส่งคำสั่งซื้อเครปและออกคิว
    - `/customer/orders/live` (GET): ตรวจสอบสถานะคิวสดของลูกค้า
    - `/customer/orders/token` (GET): ดึง Token สำหรับตรวจสอบคำสั่งซื้อ
    - `/customer/orders/replace-item` (POST): ลูกค้าเลือกเมนูอื่นทดแทนกรณีของหมด
    - `/customer/payment/promptpay` (POST): สร้างข้อมูล PromptPay QR
    - `/customer/payment/verify-slip` (POST): อัปโหลดและตรวจสอบสลิปโอนเงิน
- **ถูกเรียกใช้งานโดย**:
  - `src/index.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/controllers/customer.controller.ts`

#### 17. `server/src/routes/restaurant.route.ts`
- **หน้าที่การทำงาน**:
  - นิยาม Endpoint สำหรับระบบบริหารจัดการร้านค้าและจอครัว:
    - `/restaurant/profile` (GET, PUT): ดูและอัปเดตข้อมูลร้านค้า, ธีมสี, ข้อมูลรับเงิน
    - `/restaurant/orders` (GET): ดึงรายการออเดอร์ตามสถานะและวันที่
    - `/restaurant/orders/:orderId/status` (PATCH): เปลี่ยนสถานะออเดอร์ (pending -> cooking -> ready -> completed)
    - `/restaurant/orders/:orderId/cancel` (POST): ยกเลิกออเดอร์พร้อมระบุเหตุผล
    - `/restaurant/orders/:orderId/mark-out-of-stock` (POST): แจ้งเตือนลูกค้าว่าเมนูในออเดอร์ของหมด
    - `/restaurant/status` (PATCH): เปิด-ปิดร้าน หรือตั้งเวลาหยุดรับออเดอร์ชั่วคราว
    - `/restaurant/summary` (GET): ดึงข้อมูลสรุปยอดขายประจำวันและรายงาน
    - `/restaurant/inventory` (GET, POST, PATCH, DELETE): จัดการสต็อกวัตถุดิบ
- **ถูกเรียกใช้งานโดย**:
  - `src/index.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/controllers/restaurant.controller.ts`
  - `src/libs/authGuard.ts`

#### 18. `server/src/routes/menu.route.ts`
- **หน้าที่การทำงาน**:
  - นิยาม Endpoint สำหรับการจัดการเมนูอาหารของร้านค้า:
    - `/menu/categories` (GET, POST, PUT, DELETE): จัดการหมวดหมู่
    - `/menu/items` (GET, POST, PUT, DELETE): จัดการรายการเมนู
    - `/menu/items/:id/availability` (PATCH): เปิด/ปิดสถานะพร้อมขายของเมนู
    - `/menu/crusts` (GET, POST, PUT, DELETE): จัดการรายการแป้งเครป
    - `/menu/sample-menus` (GET, POST, PUT, DELETE): จัดการเมนูตัวอย่างหน้าแรก
- **ถูกเรียกใช้งานโดย**:
  - `src/index.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/controllers/menu.controller.ts`
  - `src/libs/authGuard.ts`

#### 19. `server/src/routes/payment.route.ts`
- **หน้าที่การทำงาน**:
  - นิยาม Endpoint จัดการระบบชำระเงิน:
    - `/payment/qr` (POST): สร้าง QR Code พร้อมเพย์ตามยอดเงิน
    - `/payment/verify` (POST): ตรวจสอบสลิปผ่าน AI
    - `/payment/status/:orderId` (GET): ตรวจสอบสถานะการชำระเงินของออเดอร์
- **ถูกเรียกใช้งานโดย**:
  - `src/index.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/controllers/payment.controller.ts`

#### 20. `server/src/routes/realtime.route.ts`
- **หน้าที่การทำงาน**:
  - นิยาม Endpoint สำหรับการสื่อสารแบบ Realtime:
    - `/realtime/events` (GET): เชื่อมต่อ Server-Sent Events (SSE) สำหรับอัปเดตคิวและสถานะคำสั่งซื้อแบบทันทีทันใด
    - `/realtime/stats` (GET): ดูจำนวนการเชื่อมต่อที่กำลังออนไลน์
- **ถูกเรียกใช้งานโดย**:
  - `src/index.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/services/realtime.service.ts`

#### 21. `server/src/routes/tts.route.ts`
- **หน้าที่การทำงาน**:
  - นิยาม Endpoint สำหรับแปลงข้อความเป็นไฟล์เสียง (Text-to-Speech):
    - `/tts/speak` (GET, POST): รับข้อความ เช่น "ขอเชิญคิวที่ 5 รับเครปที่เคาน์เตอร์ค่ะ" แล้วแปลงเป็นเสียงพูดภาษาไทย
- **ถูกเรียกใช้งานโดย**:
  - `src/index.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/services/google-api.service.ts`

#### 22. `server/src/routes/admin.route.ts`
- **หน้าที่การทำงาน**:
  - นิยาม Endpoint สำหรับผู้ดูแลระบบระดับสูง (Super Admin):
    - `/admin/shops` (GET, POST, PUT, DELETE): จัดการร้านค้าทั้งหมดในระบบ
    - `/admin/users` (GET, POST, PUT, DELETE): จัดการผู้ใช้งานและสิทธิ์
    - `/admin/system-stats` (GET): ดูสถิติรวมของทุกร้านในระบบ
- **ถูกเรียกใช้งานโดย**:
  - `src/index.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/controllers/admin.controller.ts`
  - `src/libs/authGuard.ts`

---

### กลุ่มไฟล์ที่ 4: คอนโทรลเลอร์ (Controllers)

#### 23. `server/src/controllers/auth.controller.ts`
- **หน้าที่การทำงาน**:
  - รับข้อมูลเข้าสู่ระบบและลงทะเบียน ตรวจสอบความถูกต้องของ Parameters (Username, Password, Email, Phone) แล้วส่งต่อไปยัง `AuthService`
  - ตั้งค่า Cookie หรือส่ง Token คืนกลับไปยังผู้ใช้งาน
- **ถูกเรียกใช้งานโดย**:
  - `src/routes/auth.route.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/services/auth.service.ts`

#### 24. `server/src/controllers/customer.controller.ts`
- **หน้าที่การทำงาน**:
  - จัดการคำขอจากลูกค้าทั้งหมด (ดึงเมนู, สั่งออเดอร์, ดึงสถานะคิวสด, การเปลี่ยนเมนูของหมด, ตรวจสอบสลิป)
  - แปลงรูปแบบข้อมูล Request Body และจัดการ Error Code ที่เหมาะสม
- **ถูกเรียกใช้งานโดย**:
  - `src/routes/customer.route.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/services/customer.service.ts`

#### 25. `server/src/controllers/restaurant.controller.ts`
- **หน้าที่การทำงาน**:
  - จัดการคำขอจากหลังร้าน (อัปเดตข้อมูลร้านค้า, เปลี่ยนสถานะคิว, การยกเลิกออเดอร์, ดึงสรุปยอดขาย, จัดการสต็อก)
  - ตรวจสอบสิทธิ์ความเป็นเจ้าของร้านค้า
- **ถูกเรียกใช้งานโดย**:
  - `src/routes/restaurant.route.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/services/restaurant.service.ts`

#### 26. `server/src/controllers/menu.controller.ts`
- **หน้าที่การทำงาน**:
  - จัดการคำขอสร้าง แก้ไข ลบ เมนูอาหาร หมวดหมู่ และแป้งเครป
  - ตรวจสอบความถูกต้องของรูปภาพและข้อมูลราคา
- **ถูกเรียกใช้งานโดย**:
  - `src/routes/menu.route.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/services/menu.service.ts`

#### 27. `server/src/controllers/payment.controller.ts`
- **หน้าที่การทำงาน**:
  - จัดการคำขอเกี่ยวกับการสร้าง QR Code พร้อมเพย์ และการสแกนสลิปโอนเงิน
- **ถูกเรียกใช้งานโดย**:
  - `src/routes/payment.route.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/services/customer.service.ts`
  - `src/services/gemini-slip.service.ts`

#### 28. `server/src/controllers/admin.controller.ts`
- **หน้าที่การทำงาน**:
  - จัดการคำขอสำหรับผู้ดูแลระบบระดับสูง (ดึงข้อมูลทุกร้านค้า, ดูสถิติรวม)
- **ถูกเรียกใช้งานโดย**:
  - `src/routes/admin.route.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/services/admin.service.ts`

---

### กลุ่มไฟล์ที่ 5: เซอร์วิสหลัก (Business Logic Services)

#### 29. `server/src/services/customer.service.ts`
- **หน้าที่การทำงาน**:
  - ตรรกะการทำงานหลักของระบบลูกค้า:
    - `getTableInfo()`: ดึงข้อมูลร้านค้า
    - `loginOrRegisterCustomer()`: เข้าสู่ระบบหรือสร้างบัญชีลูกค้าจากเบอร์โทรศัพท์
    - `placeOrder()`: บันทึกคำสั่งซื้อ, คำนวณราคารวม, ออกหมายเลขคิวประจำวัน (เช่น Q001, Q002), แจ้งเตือนห้องครัวผ่าน RealtimeService
    - `getLiveQueueStatus()`: ดึงสถานะคิวและจำนวนคิวก่อนหน้า
    - `replaceOutOfStockItem()`: จัดการกรณีลูกค้าเปลี่ยนรายการอาหารที่ของหมด
    - `generatePromptPay()`: สร้างโค้ด PromptPay QR
    - `verifyPaymentSlip()`: ประสานงานกับ Gemini AI และ Slip Prescreener เพื่อตรวจสอบสลิป
- **ถูกเรียกใช้งานโดย**:
  - `src/controllers/customer.controller.ts`
  - `src/controllers/payment.controller.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/repositories/index.ts` (CustomerRepositoryFactory, RestaurantRepositoryFactory)
  - `src/services/realtime.service.ts`
  - `src/services/gemini-slip.service.ts`
  - `src/services/slip-prescreener.service.ts`
  - `src/services/storage.service.ts`

#### 30. `server/src/services/restaurant.service.ts`
- **หน้าที่การทำงาน**:
  - ตรรกะการทำงานหลักของระบบร้านค้า:
    - `getOrders()`: ค้นหาออเดอร์ตามสถานะ (pending, cooking, ready, completed)
    - `updateOrderStatus()`: อัปเดตสถานะคิว พร้อมยิง Realtime Event แจ้งหน้าจอของลูกค้า
    - `cancelOrder()`: ยกเลิกคำสั่งซื้อพร้อมบันทึกเหตุผล
    - `markItemOutOfStock()`: แจ้งเปลี่ยนสถานะเป็นของหมดและส่งสัญญาณไปยังลูกค้า
    - `getSalesSummary()`: คำนวณยอดขายรวม, จำนวนออเดอร์, เมนูยอดนิยม และสถิติช่วงเวลา
    - `toggleStoreStatus()`: เปิด-ปิดร้าน หรือพักรับออเดอร์ชั่วคราว
    - `updateProfile()`: แก้ไขโปรไฟล์ ธีมสี และข้อมูลบัญชีรับเงิน
- **ถูกเรียกใช้งานโดย**:
  - `src/controllers/restaurant.controller.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/repositories/index.ts` (RestaurantRepositoryFactory)
  - `src/services/realtime.service.ts`

#### 31. `server/src/services/auth.service.ts`
- **หน้าที่การทำงาน**:
  - จัดการตรวจสอบความถูกต้องของชื่อผู้ใช้และรหัสผ่าน
  - สร้าง JWT Token พร้อมกำหนดวันหมดอายุ
  - จัดการการเปลี่ยนรหัสผ่านและตรวจสอบสถานะการเปิดใช้งานบัญชี
- **ถูกเรียกใช้งานโดย**:
  - `src/controllers/auth.controller.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/repositories/index.ts` (AuthRepositoryFactory)
  - `src/libs/jwt.ts`
  - `src/libs/password.ts`

#### 32. `server/src/services/menu.service.ts`
- **หน้าที่การทำงาน**:
  - จัดการ CRUD (สร้าง อ่าน แก้ไข ลบ) หมวดหมู่ เมนูอาหาร ตัวเลือกท็อปปิ้ง แป้งเครป และเมนูตัวอย่าง
  - จัดการเรียงลำดับหมวดหมู่และการเปิด/ปิดการมองเห็นของเมนู
- **ถูกเรียกใช้งานโดย**:
  - `src/controllers/menu.controller.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/repositories/index.ts` (MenuRepositoryFactory)
  - `src/services/storage.service.ts`

#### 33. `server/src/services/gemini-slip.service.ts`
- **หน้าที่การทำงาน**:
  - วิเคราะห์และตรวจสอบรูปภาพสลิปโอนเงินธนาคารไทยด้วย Google Gemini 1.5 Flash Vision AI
  - ตรวจสอบความถูกต้อง 5 มิติ:
    1. เป็นสลิปธนาคารจริงหรือไม่
    2. ชื่อบัญชีหรือเลขบัญชีปลายทางตรงกับร้านค้าหรือไม่
    3. ยอดเงินตรงกับยอดรวมของออเดอร์หรือไม่
    4. วันที่และเวลาในสลิปถูกต้องและเป็นปัจจุบันหรือไม่
    5. ตรวจสอบร่องรอยการตัดต่อ ดัดแปลง หรือภาพปลอม
  - ส่งคืนผลลัพธ์พร้อมเหตุผลปฏิเสธเป็นภาษาไทยที่เข้าใจง่าย
- **ถูกเรียกใช้งานโดย**:
  - `src/services/customer.service.ts`
  - `src/controllers/payment.controller.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `@google/generative-ai`

#### 34. `server/src/services/slip-prescreener.service.ts`
- **หน้าที่การทำงาน**:
  - คัดกรองและตรวจสอบรูปภาพเบื้องต้นก่อนส่งไปยัง Gemini AI เพื่อประหยัดโควตาและเพิ่มความเร็ว
  - ตรวจสอบรูปแบบไฟล์, ขนาดไฟล์, ความละเอียด, และโครงสร้างของรูปภาพ
- **ถูกเรียกใช้งานโดย**:
  - `src/services/customer.service.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 35. `server/src/services/realtime.service.ts`
- **หน้าที่การทำงาน**:
  - จัดการการเชื่อมต่อ Server-Sent Events (SSE) และการกระจายข่าวสาร (Pub/Sub)
  - กระจายเหตุการณ์ (Events) แบบทันทีทันใด เช่น:
    - `NEW_ORDER`: มีออเดอร์ใหม่เข้ามา (ส่งไปยังจอครัว)
    - `ORDER_STATUS_CHANGED`: สถานะออเดอร์เปลี่ยนไป (ส่งไปยังจอลูกค้า)
    - `ORDER_CANCELLED`: ออเดอร์ถูกยกเลิก
    - `ITEM_OUT_OF_STOCK`: เมนูที่สั่งของหมด
    - `STORE_STATUS_CHANGED`: ร้านเปิด/ปิด หรือพักรับออเดอร์
- **ถูกเรียกใช้งานโดย**:
  - `src/routes/realtime.route.ts`
  - `src/services/customer.service.ts`
  - `src/services/restaurant.service.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/services/redis.service.ts` (กรณีใช้งานโหมด Multi-instance)

#### 36. `server/src/services/storage.service.ts`
- **หน้าที่การทำงาน**:
  - จัดการการจัดเก็บไฟล์รูปภาพในเครื่อง (Local Disk Storage)
  - แปลง Base64 เป็นไฟล์รูปภาพ, สร้างชื่อไฟล์แบบไม่ซ้ำ (UUID/Timestamp), ปรับแต่งขนาด และลบไฟล์เก่า
- **ถูกเรียกใช้งานโดย**:
  - `src/services/customer.service.ts` (บันทึกสลิป)
  - `src/services/menu.service.ts` (บันทึกรูปเมนู)
  - `src/services/restaurant.service.ts` (บันทึกโลโก้/ปก)
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `fs`, `path`

#### 37. `server/src/services/google-api.service.ts`
- **หน้าที่การทำงาน**:
  - เชื่อมต่อกับ Google Cloud API เพื่อให้บริการแปลงข้อความเป็นเสียงพูดภาษาไทย (Text-to-Speech) คุณภาพสูง
- **ถูกเรียกใช้งานโดย**:
  - `src/routes/tts.route.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 38. `server/src/services/google-drive.service.ts`
- **หน้าที่การทำงาน**:
  - จัดการการอัปโหลดและสำรองไฟล์รูปภาพไปยัง Google Drive
- **ถูกเรียกใช้งานโดย**:
  - `src/services/storage.service.ts` (ทางเลือกเสริม)
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 39. `server/src/services/redis.service.ts`
- **หน้าที่การทำงาน**:
  - ให้บริการจัดการ Caching และ Pub/Sub ผ่าน Redis
- **ถูกเรียกใช้งานโดย**:
  - `src/services/realtime.service.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/config/env.config.ts`

#### 40. `server/src/services/omise.service.ts`
- **หน้าที่การทำงาน**:
  - รองรับการเชื่อมต่อกับ Payment Gateway ภายนอก (Omise / Opn Payments)
- **ถูกเรียกใช้งานโดย**:
  - `src/services/customer.service.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 41. `server/src/services/admin.service.ts`
- **หน้าที่การทำงาน**:
  - จัดการตรรกะระบบของผู้ดูแลระบบระดับสูง (จัดการร้านค้า, สรุปสถิติระบบ)
- **ถูกเรียกใช้งานโดย**:
  - `src/controllers/admin.controller.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/repositories/index.ts` (AdminRepositoryFactory)

---

### กลุ่มไฟล์ที่ 6: เลเยอร์ฐานข้อมูล (Repositories & Interfaces)

#### 42. `server/src/repositories/index.ts`
- **หน้าที่การทำงาน**:
  - ศูนย์รวมและจุดส่งออก (Aggregator & Factory) สำหรับ Repository Layer
  - สร้างและส่งออกคลาส Factory ตามหลัก Singleton:
    - `AuthRepositoryFactory`
    - `MenuRepositoryFactory`
    - `AdminRepositoryFactory`
    - `RestaurantRepositoryFactory`
    - `CustomerRepositoryFactory`
- **ถูกเรียกใช้งานโดย**:
  - ทุก Service ภายใน `src/services/*`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/repositories/interfaces/*`
  - `src/repositories/prisma/*`

#### 43. `server/src/repositories/interfaces/*.ts`
- **รายชื่อไฟล์ย่อย**:
  - `admin.repository.interface.ts`
  - `auth.repository.interface.ts`
  - `customer.repository.interface.ts`
  - `menu.repository.interface.ts`
  - `restaurant.repository.interface.ts`
- **หน้าที่การทำงาน**:
  - กำหนดสัญญาวิธีการ (Method Signatures) และ Data Transfer Objects (DTOs) สำหรับการรับ-ส่งข้อมูลระหว่าง Service และ Repository
- **ถูกเรียกใช้งานโดย**:
  - `src/repositories/index.ts`
  - `src/repositories/prisma/*`
  - `src/services/*`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 44. `server/src/repositories/prisma/*.ts`
- **รายชื่อไฟล์ย่อย**:
  - `admin.prisma.ts`: ดำเนินการคำสั่ง Prisma กับตารางร้านค้าและระบบแอดมิน
  - `auth.prisma.ts`: ดำเนินการคำสั่ง Prisma สำหรับตรวจสอบผู้ใช้งานร้านค้า
  - `customer.prisma.ts`: ดำเนินการคำสั่ง Prisma สำหรับการสั่งอาหาร, ออกเลขคิว, ดึงเมนู, และตรวจสอบสถานะคิว
  - `menu.prisma.ts`: ดำเนินการคำสั่ง Prisma สำหรับการเพิ่ม แก้ไข ลบ เมนูและหมวดหมู่
  - `restaurant.prisma.ts`: ดำเนินการคำสั่ง Prisma สำหรับการจัดการออเดอร์ในครัว, สรุปยอดขาย, อัปเดตโปรไฟล์ร้าน, และสต็อก
- **ถูกเรียกใช้งานโดย**:
  - `src/repositories/index.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `src/database/prisma.ts`
  - `src/repositories/interfaces/*`

---

## 5. ลำดับขั้นตอนการทำงานที่สำคัญ (Core Data Flows)

### 5.1 ขั้นตอนการสั่งซื้อและการออกคิวของลูกค้า (Customer Ordering Flow)
1. ลูกค้าเลือกเมนู แป้งเครป ไส้หวาน/คาว และท็อปปิ้งผ่านหน้าเว็บ
2. หน้าเว็บส่งคำขอ POST มาที่ `/api/v1/customer/orders`
3. `customer.route.ts` รับข้อมูลและส่งต่อให้ `customer.controller.ts`
4. `customer.service.ts` ตรวจสอบสถานะร้านค้า (เปิดร้านอยู่หรือไม่) และคำนวณราคา
5. `customer.prisma.ts` บันทึกข้อมูลลงตาราง `orders`, `order_items`, `menu_option_orderItem` และรันหมายเลขคิวประจำวัน
6. `realtime.service.ts` กระจาย Event `NEW_ORDER` ไปยังหน้าจอครัวของร้านค้าทันที
7. เซิร์ฟเวอร์ส่งหมายเลขคิวและ Token คืนกลับไปให้หน้าจอของลูกค้า

### 5.2 ขั้นตอนการตรวจสอบสลิปโอนเงินด้วย AI (AI Slip Verification Flow)
1. ลูกค้าอัปโหลดรูปภาพสลิปโอนเงินผ่านหน้าเว็บ
2. หน้าเว็บส่งภาพ Base64 มาที่ `/api/v1/customer/payment/verify-slip`
3. `slip-prescreener.service.ts` ตรวจสอบความถูกต้องของขนาดและโครงสร้างรูปภาพเบื้องต้น
4. `gemini-slip.service.ts` ส่งรูปภาพและข้อมูลบัญชีร้านค้าไปยัง Google Gemini AI Vision เพื่อตรวจสอบ 5 เกณฑ์หลัก
5. หากผ่านเกณฑ์ ระบบจะอัปเดตสถานะการชำระเงินในตาราง `orders` และ `payments` เป็น `paid`
6. `realtime.service.ts` ส่งสัญญาณแจ้งเตือนไปยังทั้งหน้าจอลูกค้าและจอครัว
7. `storage.service.ts` บันทึกไฟล์รูปภาพสลิปลงใน `uploads/slips/` เพื่อเป็นหลักฐาน

---
