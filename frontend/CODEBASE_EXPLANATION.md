# เอกสารอธิบายโครงสร้างและการทำงานของระบบหน้าบ้าน (Frontend Codebase Architecture)

เอกสารฉบับนี้จัดทำขึ้นเพื่ออธิบายโครงสร้าง โค้ดแต่ละโฟลเดอร์ และแต่ละไฟล์ของระบบหน้าบ้าน (Frontend Web Application) ของระบบ CrepeQ อย่างละเอียด โดยมุ่งเน้นให้อ่านเข้าใจง่าย เห็นภาพรวมความสัมพันธ์ และระบุจุดที่ไฟล์แต่ละไฟล์ถูกเรียกใช้งานในระบบอย่างครบถ้วน

---

## 1. ภาพรวมสถาปัตยกรรมระบบหน้าบ้าน (Frontend Architecture Overview)

ระบบหน้าบ้านของ CrepeQ พัฒนาขึ้นโดยใช้เทคโนโลยีหลักดังนี้:
- **Framework**: Next.js 15 (App Router Architecture)
- **UI Library**: React 19 และ TypeScript
- **Styling**: Tailwind CSS ร่วมกับ CSS Custom Variables และ Tailwind Variants
- **Animation**: Framer Motion สำหรับ Micro-interactions และ Transitions
- **Icons**: Lucide React
- **Audio & Realtime**: Web Audio API, HTML5 Audio, Web Speech API (TTS) และ Server-Sent Events (SSE)
- **State & Data Management**: React Context, Custom Hooks, LocalStorage และ Server/Client API Layer

ระบบแบ่งออกเป็น 2 ฝั่งการทำงานหลัก:
1. **ระบบสำหรับลูกค้า (Customer Portal)**: หน้าสั่งเครปแบบปรับแต่งเอง (Custom Crepe Builder), การเลือกเวลาและประเภทการรับสินค้า, การชำระเงินผ่าน PromptPay QR พร้อมอัปโหลดสลิป, และหน้าติดตามสถานะคิวสด (Live Queue Tracking)
2. **ระบบสำหรับร้านค้าและห้องครัว (Restaurant & Kitchen Portal)**: หน้าแดชบอร์ดจัดการคิวสด (Kanban / Queue Cards), การปรับสถานะออเดอร์ (ยืนยัน -> กำลังทำ -> เสร็จพร้อมเสิร์ฟ), เสียงประกาศเรียกคิวอัตโนมัติ (TTS + Chime), การจัดการสินค้าหมด (Out of Stock), การพักรับออเดอร์ชั่วคราว, การจัดการสต็อกวัตถุดิบ, และหน้ารายงานสรุปยอดขายพร้อมส่งออก Excel

---

## 2. โครงสร้างโฟลเดอร์ทั้งหมดของระบบหน้าบ้าน (Folder Hierarchy)

```
frontend/
├── app/                             # Next.js App Router (เส้นทางและคอมโพเนนต์หลัก)
│   ├── (restaurant)/                # Route Group สำหรับระบบจัดการหลังร้าน
│   │   └── restaurant/              # เส้นทาง /restaurant/*
│   │       ├── profile/             # หน้าแก้ไขโปรไฟล์ร้านค้าและข้อมูลรับเงิน
│   │       ├── queue/               # หน้าแดชบอร์ดจัดการคิวสดในครัว
│   │       ├── settings/            # หน้าตั้งค่าระบบร้านค้า
│   │       ├── summary/             # หน้ารายงานและสรุปยอดขาย
│   │       ├── RestaurantProvider.tsx # Context Provider จัดการ State ของร้านค้า
│   │       ├── layout.tsx           # Layout หลักของฝั่งร้านค้า
│   │       └── page.tsx             # จุดเริ่มต้นที่ Redirect ไปยัง /restaurant/queue
│   ├── api/                         # Next.js API Routes (Backend Reverse Proxy)
│   │   ├── auth/logout/             # API จัดการล้าง Auth Cookie
│   │   └── v1/[...path]/            # Reverse Proxy ส่งต่อคำขอไปยัง Backend Port 8008
│   ├── components/                  # คอมโพเนนต์ UI ทั้งหมด
│   │   ├── auth/                    # คอมโพเนนต์ด้านความปลอดภัยและการตรวจสอบสิทธิ์
│   │   ├── customer/                # คอมโพเนนต์สำหรับฝั่งลูกค้า
│   │   ├── icons/                   # ไอคอน SVG เฉพาะทาง
│   │   ├── layout/                  # แถบเมนู แถบด้านข้าง และการจัดเลย์เอาต์
│   │   ├── restaurant/              # โมดอลและเครื่องมือสำหรับฝั่งร้านค้า
│   │   ├── skeletons/               # UI โหลดดิ้งจำลองสถานะกำลังโหลด
│   │   └── ui/                      # คอมโพเนนต์พื้นฐานที่ใช้ซ้ำได้ (Button, Card, Modal, ฯลฯ)
│   ├── lib/                         # ยูทิลิตี้และไลบรารีช่วยงาน
│   │   ├── api/                     # API Client สำหรับเรียกใช้งาน Backend Endpoints
│   │   ├── AudioAlertService.ts     # บริการเล่นเสียงเตือนและ Chime
│   │   ├── customer-auth.ts         # จัดการ Token และ Session ของลูกค้า
│   │   ├── customer-session.ts      # จัดการ Local Storage ของลูกค้า
│   │   ├── excelExport.ts           # ส่งออกรายงานยอดขายเป็นไฟล์ Excel
│   │   ├── mock-data.ts             # ข้อมูลจำลองและ Type Definitions
│   │   ├── thai-address.ts          # จัดการข้อมูลที่อยู่ภาษาไทย
│   │   ├── theme.ts                 # จัดการธีมสีและการปรับแต่งสีร้านค้า
│   │   ├── useRestaurantRealtime.ts # Hook จัดการ SSE และเสียงแจ้งเตือน
│   │   └── utils.ts                 # ฟังก์ชันช่วยเหลือทั่วไป (cn, formatters, crepe parser)
│   ├── login/                       # หน้าระบบเข้าสู่ระบบของร้านค้า (/login)
│   ├── globals.css                  # สไตล์ชีต CSS หลักและการตั้งค่า Tailwind
│   ├── layout.tsx                   # Root Layout ของทั้งแอปพลิเคชัน
│   ├── loading.tsx                  # หน้าจอโหลดดิ้งระดับแอปพลิเคชัน
│   ├── not-found.tsx                # หน้าจอแจ้งเตือน 404 ไม่พบหน้า
│   └── page.tsx                     # หน้าแรกของระบบสำหรับลูกค้า (Root /)
├── public/                          # ไฟล์ Static เช่น โลโก้ รูปพื้นหลัง และไอคอน
├── Dockerfile                       # การตั้งค่า Container สำหรับ Production Deployment
├── eslint.config.mjs                # การตั้งค่า ESLint
├── next.config.ts                   # การตั้งค่าคอนฟิกูเรชันของ Next.js
├── package.json                     # รายการ Dependencies และคำสั่งรันระบบ
├── postcss.config.mjs               # การตั้งค่า PostCSS
├── proxy.ts                         # Edge Middleware สำหรับป้องกัน Route และสิทธิ์การใช้งาน
├── tsconfig.json                    # การตั้งค่า TypeScript Compiler
└── vercel.json                      # การตั้งค่าการ Deploy บน Vercel Platform
```

---

## 3. คำอธิบายรายละเอียดของแต่ละโฟลเดอร์ (Directory Breakdown)

### 3.1 `frontend/app/`
- **หน้าที่และความสำคัญ**: โครงสร้างเส้นทางหลักตาม App Router ของ Next.js 15
- **การทำงาน**: บรรจุทั้ง Root Layout, Metadata, หน้าสั่งอาหารสำหรับลูกค้า, หน้าระบบร้านค้า, และ API Proxy Routes

### 3.2 `frontend/app/(restaurant)/restaurant/`
- **หน้าที่และความสำคัญ**: Route Group สำหรับพื้นที่ของผู้ดูแลร้านค้าและพนักงาน
- **การทำงาน**: รวมศูนย์การทำงานของห้องครัว เช่น หน้ารายการคิวสด, การสรุปยอดขาย, การตั้งค่าร้าน และโปรไฟล์ร้านค้า โดยครอบด้วย `RestaurantProvider` เพื่อแชร์สถานะของร้านและออเดอร์แบบเรียลไทม์

### 3.3 `frontend/app/api/`
- **หน้าที่และความสำคัญ**: Next.js Server-Side API Handlers
- **การทำงาน**: ทำหน้าที่เป็น Reverse Proxy คอยรับคำขอจากหน้าบ้าน แล้วแทรก Header ความปลอดภัย (`x-api-key`) ก่อนส่งต่อไปยังเซิร์ฟเวอร์หลังบ้าน (Backend Server) เพื่อป้องกันการเปิดเผย API Key ให้แก่ผู้ใช้งาน

### 3.4 `frontend/app/components/`
- **หน้าที่และความสำคัญ**: ศูนย์รวมคอมโพเนนต์ส่วนติดต่อผู้ใช้ (UI Components)
- **การทำงาน**: จัดหมวดหมู่อย่างเป็นระเบียบ แบ่งเป็นคอมโพเนนต์ลูกค้า (`customer/`), คอมโพเนนต์ร้านค้า (`restaurant/`), โครงสร้างหน้าเว็บ (`layout/`), ระบบความปลอดภัย (`auth/`), หน้าจำลองการโหลด (`skeletons/`) และชิ้นส่วนพื้นฐาน (`ui/`)

### 3.5 `frontend/app/lib/`
- **หน้าที่และความสำคัญ**: แหล่งรวมเครื่องมือ ยูทิลิตี้ และฟังก์ชันเชื่อมต่อ API
- **การทำงาน**: บรรจุโมดูลเชื่อมต่อ API ฝั่งลูกค้าและร้านค้า, การจัดการไฟล์เสียงแจ้งเตือน, การประมวลผลข้อความและข้อมูลเครป, การคำนวณธีมสี, และการเชื่อมต่อ Realtime SSE

### 3.6 `frontend/public/`
- **หน้าที่และความสำคัญ**: จัดเก็บไฟล์มีเดียคงที่ (Static Assets)
- **การทำงาน**: บรรจุภาพโลโก้ร้าน (`Logo.png`, `LogoSquare.png`), ภาพพื้นหลังความละเอียดสูง (`BG.png`, `BG_M.png`), และไฟล์ไอคอน SVG

---

## 4. คำอธิบายการทำงานของไฟล์อย่างละเอียด (File-by-File Breakdown)

---

### กลุ่มไฟล์ที่ 1: ไฟล์รากและการตั้งค่าระบบ (Root & Configuration Files)

#### 1. `frontend/proxy.ts`
- **หน้าที่การทำงาน**:
  - Edge Middleware สำหรับควบคุมการเข้าถึงเส้นทาง (Route Protection & Authentication Guard)
  - ถอดรหัส JWT Payload จาก Cookie `auth_token` ในระดับ Edge Runtime โดยไม่พึ่งพาไลบรารีภายนอก
  - ตรวจสอบสถานะและวันหมดอายุของ Token
  - ป้องกันเส้นทาง `/restaurant/*` และ `/admin/*` หากยังไม่ได้เข้าสู่ระบบจะส่งกลับไปยัง `/login`
  - ป้องกันผู้ใช้ที่เข้าสู่ระบบแล้วไม่ให้เข้าหน้า `/login` หรือ `/register` ซ้ำซ้อน
  - ตรวจสอบ Role ของผู้ใช้เพื่อป้องกันการเข้าถึงหน้าแอดมินโดยไม่ได้รับอนุญาต
- **ถูกเรียกใช้งานโดย**:
  - Next.js Engine (ทำงานอัตโนมัติในทุก HTTP Request ตามเงื่อนไข `config.matcher`)
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 2. `frontend/next.config.ts`
- **หน้าที่การทำงาน**:
  - กำหนดการตั้งค่าของ Next.js เช่น การอนุญาตโหลดรูปภาพจาก Remote Domains (Google Drive, Cloud Storage, Localhost), การตั้งค่า Headers และ Environment Variables
- **ถูกเรียกใช้งานโดย**:
  - Next.js Build และ Dev Server
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 3. `frontend/package.json`
- **หน้าที่การทำงาน**:
  - กำหนด Dependencies ทั้งหมด (React 19, Next.js 15, Lucide React, Framer Motion, XLSX, Canvas-Confetti, Sonner, Tailwind) และ Scripts ในการรัน `dev`, `build`, `start`, `lint`
- **ถูกเรียกใช้งานโดย**:
  - Bun / Node.js Package Manager
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 4. `frontend/tsconfig.json`
- **หน้าที่การทำงาน**:
  - กำหนดกฎระเบียบ TypeScript Compiler และ Path Alias `@/*` ชี้ไปยังรากของโปรเจกต์
- **ถูกเรียกใช้งานโดย**:
  - TypeScript Compiler / Next.js
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 5. `frontend/Dockerfile`
- **หน้าที่การทำงาน**:
  - สคริปต์ Multi-stage Build สำหรับสร้าง Production Container ของ Next.js Standalone Mode
- **ถูกเรียกใช้งานโดย**:
  - Docker Engine / Deployment Pipelines
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 6. `frontend/eslint.config.mjs` และ `frontend/postcss.config.mjs`
- **หน้าที่การทำงาน**:
  - จัดการตรวจสอบคุณภาพโค้ด (ESLint) และประมวลผล CSS (PostCSS & Tailwind)
- **ถูกเรียกใช้งานโดย**:
  - Next.js Build Pipeline
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 7. `frontend/vercel.json`
- **หน้าที่การทำงาน**:
  - กำหนดการตั้งค่า Header, Routing และ Region สำหรับการ Deploy บน Vercel Cloud
- **ถูกเรียกใช้งานโดย**:
  - Vercel Deployment System
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

---

### กลุ่มไฟล์ที่ 2: หน้าหลักและเลย์เอาต์ (App Pages & Layouts)

#### 8. `frontend/app/layout.tsx`
- **หน้าที่การทำงาน**:
  - Root Layout ระดับบนสุดของแอปพลิเคชัน
  - กำหนด HTML Structure, ภาษา (`lang="th"`), Font Family (Inter / Kanit / Prompt)
  - ติดตั้งคอมโพเนนต์แจ้งเตือน Toaster (Sonner) และ `LineBrowserRedirect` สำหรับแก้ไขปัญหาเปิดเว็บผ่าน In-App Browser ของ Line
- **ถูกเรียกใช้งานโดย**:
  - Next.js Router (ครอบทุกหน้าในโปรเจกต์)
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/globals.css`
  - `app/components/LineBrowserRedirect.tsx`

#### 9. `frontend/app/page.tsx`
- **หน้าที่การทำงาน**:
  - หน้าแรกของระบบสำหรับลูกค้า (Root Customer Page)
  - โหลดและแสดงผลคอมโพเนนต์ `MenuClient` ภายใต้ `Suspense Boundary` พร้อมกับ `MenuSkeleton`
  - กำหนด Page Title และ Meta Description สำหรับ SEO
- **ถูกเรียกใช้งานโดย**:
  - Next.js Router เมื่อผู้ใช้เข้าสู่ URL `/`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/customer/MenuClient.tsx`

#### 10. `frontend/app/loading.tsx`
- **หน้าที่การทำงาน**:
  - หน้าจอ Loading Indicator ขณะโหลดหน้าเว็บระดับแอปพลิเคชัน
- **ถูกเรียกใช้งานโดย**:
  - Next.js Router ขณะทำ Server-Side Navigation
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/ui/Loading.tsx`

#### 11. `frontend/app/not-found.tsx`
- **หน้าที่การทำงาน**:
  - หน้าจอแสดงผลข้อผิดพลาด 404 เมื่อไม่พบหน้าที่ระบุ พร้อมปุ่มนำทางกลับหน้าหลัก
- **ถูกเรียกใช้งานโดย**:
  - Next.js Router เมื่อเกิดข้อผิดพลาด 404
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/ui/Button.tsx`

#### 12. `frontend/app/globals.css`
- **หน้าที่การทำงาน**:
  - สไตล์ชีต CSS หลักของระบบ กำหนด CSS Variables สำหรับชุดสี (Theme Colors), Background Patterns, Glassmorphism Effects, Custom Scrollbars และ Keyframe Animations
- **ถูกเรียกใช้งานโดย**:
  - `app/layout.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 13. `frontend/app/login/page.tsx`
- **หน้าที่การทำงาน**:
  - หน้าจอเข้าสู่ระบบสำหรับเจ้าของร้านและพนักงาน
  - มีฟอร์มกรอก Username / Password, การแสดงผลข้อผิดพลาด, และการบันทึก Cookie การเข้าสู่ระบบเมื่อผ่านการตรวจสอบ
  - ทำการ Redirect อัตโนมัติไปยังหน้าจัดการคิวร้านค้าหลังเข้าสู่ระบบสำเร็จ
- **ถูกเรียกใช้งานโดย**:
  - Next.js Router เมื่อผู้ใช้เข้าสู่ URL `/login`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/api/auth.api.ts`
  - `app/components/ui/Button.tsx`
  - `app/components/ui/Input.tsx`

---

### กลุ่มไฟล์ที่ 3: เส้นทางและหน้าของระบบร้านค้า (Restaurant Pages & Context)

#### 14. `frontend/app/(restaurant)/restaurant/layout.tsx`
- **หน้าที่การทำงาน**:
  - Layout เฉพาะสำหรับฝั่งร้านค้า ครอบการทำงานด้วย `RestaurantProvider` และ `AdminGuard`
  - แสดงผลแถบเมนูด้านข้าง (`RestaurantSidebar`) สำหรับหน้าจอขนาดใหญ่ และเมนูด้านล่าง (`MobileNav`) สำหรับหน้าจอโทรศัพท์มือถือ
- **ถูกเรียกใช้งานโดย**:
  - Next.js Router ครอบทุกหน้าในกลุ่ม `/restaurant/*`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/(restaurant)/restaurant/RestaurantProvider.tsx`
  - `app/components/auth/AdminGuard.tsx`
  - `app/components/layout/RestaurantSidebar.tsx`
  - `app/components/layout/MobileNav.tsx`

#### 15. `frontend/app/(restaurant)/restaurant/RestaurantProvider.tsx`
- **หน้าที่การทำงาน**:
  - Context Provider กลางสำหรับแชร์สถานะและฟังก์ชันของร้านค้าทั่วทั้งระบบ:
    - ข้อมูลโปรไฟล์ร้านค้า (`shopInfo`)
    - รายการออเดอร์สดในครัว (`orders`)
    - ฟังก์ชันอัปเดตสถานะออเดอร์ (`updateOrderStatus`)
    - ฟังก์ชันเปิด-ปิดร้าน และพักรับออเดอร์ชั่วคราว (`toggleStoreStatus`)
    - การเชื่อมต่อ Realtime SSE และเสียงแจ้งเตือนผ่าน `useRestaurantRealtime`
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/layout.tsx`
  - หน้าและคอมโพเนนต์ย่อยของร้านค้าทั้งหมดผ่าน Hook `useRestaurant()`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/api/restaurant.api.ts`
  - `app/lib/useRestaurantRealtime.ts`

#### 16. `frontend/app/(restaurant)/restaurant/page.tsx`
- **หน้าที่การทำงาน**:
  - รูทหลักของส่วนร้านค้า ทำหน้าที่สั่ง Redirect ผู้ใช้ไปยังหน้าคิวคำสั่งซื้อ (`/restaurant/queue`)
- **ถูกเรียกใช้งานโดย**:
  - เมื่อผู้ใช้เข้าสู่ URL `/restaurant`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 17. `frontend/app/(restaurant)/restaurant/queue/page.tsx`
- **หน้าที่การทำงาน**:
  - หน้าเพจ Server Component สำหรับแดชบอร์ดจัดการคิว โหลดคอมโพเนนต์ `QueueClient` ภายใต้ Suspense Boundary
- **ถูกเรียกใช้งานโดย**:
  - URL `/restaurant/queue`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/(restaurant)/restaurant/queue/QueueClient.tsx`
  - `app/components/skeletons/RestaurantQueueSkeleton.tsx`

#### 18. `frontend/app/(restaurant)/restaurant/queue/QueueClient.tsx`
- **หน้าที่การทำงาน**:
  - คอมโพเนนต์หลักที่มีความซับซ้อนสูงสำหรับหน้าจอจัดการคิวในครัว:
    - แสดงผลการ์ดคิวแยกตามสถานะ (รอยืนยัน, กำลังทำ, เสร็จพร้อมรับ, ส่งมอบแล้ว)
    - รองรับการกรองตามวันที่, การค้นหาตามหมายเลขคิว, และการกรองตามสถานะ
    - ปุ่มควบคุมการทำงานของครัว (กดยืนยันรับออเดอร์, กดเริ่มทำ, กดแจ้งอาหารเสร็จพร้อมเรียกเสียงประกาศ TTS, กดยืนยันชำระเงิน)
    - ระบบเปิดดูสลิปโอนเงินขยายใหญ่และตรวจสอบความถูกต้อง
    - ระบบแจ้งเตือนสินค้าหมด (`OutOfStockModal`) และส่งสัญญาณให้ลูกค้าเลือกเมนูอื่น
    - การตั้งเวลาพักรับออเดอร์ชั่วคราว (`PauseStoreModal`)
    - การเล่นเสียงกระดิ่ง (Chime) และเสียงอ่านหมายเลขคิวภาษาไทย
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/queue/page.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/(restaurant)/restaurant/RestaurantProvider.tsx`
  - `app/components/restaurant/OutOfStockModal.tsx`
  - `app/components/restaurant/PauseStoreModal.tsx`
  - `app/components/ui/Badge.tsx`
  - `app/components/ui/Button.tsx`
  - `app/components/ui/SafeImage.tsx`
  - `app/lib/useRestaurantRealtime.ts`
  - `app/lib/utils.ts`

#### 19. `frontend/app/(restaurant)/restaurant/summary/page.tsx` และ `SummaryClient.tsx`
- **หน้าที่การทำงาน**:
  - หน้ารายงานและสรุปผลยอดขายประจำวัน สัปดาห์ และเดือน
  - แสดงผลสถิติจำนวนออเดอร์, ยอดเงินรวม, วิธีการชำระเงิน (พร้อมเพย์/เงินสด), สินค้าขายดี
  - มีปุ่มส่งออกรายงานยอดขายออกมาเป็นไฟล์ Excel ผ่านไลบรารี `excelExport.ts`
- **ถูกเรียกใช้งานโดย**:
  - URL `/restaurant/summary`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/api/restaurant.api.ts`
  - `app/lib/excelExport.ts`
  - `app/components/skeletons/RestaurantSummarySkeleton.tsx`

#### 20. `frontend/app/(restaurant)/restaurant/profile/page.tsx`
- **หน้าที่การทำงาน**:
  - หน้าจอจัดการโปรไฟล์ร้านค้า: แก้ไขชื่อร้าน, คำอธิบาย, เวลาเปิด-ปิด, ที่อยู่ร้าน, ตำแหน่งพิกัดบน Google Map (`GoogleMapPicker`), ช่องทางโซเชียลมีเดีย, ธีมสีของร้าน และข้อมูลบัญชีธนาคาร/PromptPay QR
- **ถูกเรียกใช้งานโดย**:
  - URL `/restaurant/profile`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/api/restaurant.api.ts`
  - `app/components/GoogleMapPicker.tsx`
  - `app/components/ui/Input.tsx`
  - `app/components/ui/Button.tsx`

#### 21. `frontend/app/(restaurant)/restaurant/settings/page.tsx`
- **หน้าที่การทำงาน**:
  - หน้าจอตั้งค่าการทำงานของระบบร้านค้า เช่น การเปิด/ปิดเสียงประกาศ TTS, การจัดการบัญชีผู้ใช้งานพนักงาน, และการตั้งค่าระบบแจ้งเตือน
- **ถูกเรียกใช้งานโดย**:
  - URL `/restaurant/settings`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/skeletons/RestaurantSettingsSkeleton.tsx`

---

### กลุ่มไฟล์ที่ 4: เซิร์ฟเวอร์ API พร็อกซี (API Reverse Proxy Routes)

#### 22. `frontend/app/api/v1/[...path]/route.ts`
- **หน้าที่การทำงาน**:
  - ทำหน้าที่เป็น Reverse Proxy Gateway รับคำขอจากฝั่งหน้าบ้าน (`/api/v1/*`) แล้วส่งต่อไปยัง Backend API (`http://localhost:8008/api/v1/*` หรือค่าจาก `BACKEND_API_URL`)
  - แทรก Header `x-api-key` อย่างปลอดภัยจาก Server Environment ป้องกันการเปิดเผย API Key ในเบราว์เซอร์
  - ส่งต่อ Cookie การยืนยันตัวตน และรองรับการสตรีมข้อมูล Server-Sent Events (SSE) โดยไม่ตัดการเชื่อมต่อ
  - รองรับทุก HTTP Methods (GET, POST, PUT, PATCH, DELETE, OPTIONS)
- **ถูกเรียกใช้งานโดย**:
  - `app/lib/api/client.ts` และการเรียก Fetch ทั้งหมดจากฝั่งไคลเอนต์
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - เซิร์ฟเวอร์หลังบ้าน (Backend Server)

#### 23. `frontend/app/api/auth/logout/route.ts`
- **หน้าที่การทำงาน**:
  - ลบ Cookie `auth_token` ในฝั่ง Server Response เพื่อทำการออกจากระบบอย่างสมบูรณ์
- **ถูกเรียกใช้งานโดย**:
  - `app/lib/api/auth.api.ts` (ฟังก์ชัน `logout`)
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

---

### กลุ่มไฟล์ที่ 5: คอมโพเนนต์ฝั่งลูกค้า (Customer Components)

#### 24. `frontend/app/components/customer/MenuClient.tsx`
- **หน้าที่การทำงาน**:
  - คอมโพเนนต์หน้าจอหลักของลูกค้า (Customer Experience Hub):
    - ควบคุมการสลับหน้าระหว่าง: หน้าแรกแนะนำร้าน (`LandingView`), หน้ารายการเมนูและสั่งเครป (`CustomCrepeBuilder`), หน้าชำระเงิน (`PaymentCheckoutView`), และหน้าติดตามคิวสด (`LiveOrderTrackingView`)
    - จัดการ State ของตะกร้าสินค้า (Cart), โต๊ะอาหาร, และข้อมูลลูกค้า
    - จัดการระบบยืนยันตัวตนลูกค้าผ่าน `CustomerLoginModal`
    - ตรวจสอบสถานะร้านค้า (เปิดร้านอยู่ หรือร้านพักรับออเดอร์ชั่วคราว)
- **ถูกเรียกใช้งานโดย**:
  - `app/page.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/customer/LandingView.tsx`
  - `app/components/customer/CustomCrepeBuilder.tsx`
  - `app/components/customer/PaymentCheckoutView.tsx`
  - `app/components/customer/LiveOrderTrackingView.tsx`
  - `app/components/CustomerLoginModal.tsx`
  - `app/lib/api/customer.api.ts`

#### 25. `frontend/app/components/customer/CustomCrepeBuilder.tsx`
- **หน้าที่การทำงาน**:
  - หน้าจออินเตอร์แอคทีฟสำหรับปรับแต่งเครปตามใจชอบ:
    - เลือกประเภทแป้งเครป (แป้งดั้งเดิม, แป้งชาโคล, แป้งชาเขียว ฯลฯ)
    - เลือกความกรอบของแป้ง
    - เลือกไส้หวาน ไส้คาว ซอส และท็อปปิ้ง พร้อมคำนวณราคาแบบเรียลไทม์
    - มีตัวเลือกใส่กล่อง/ใส่ซอง และการระบุข้อความเพิ่มเติมถึงคนทำ
    - ปุ่มเพิ่มลงในตะกร้าสินค้าพร้อมแอนิเมชัน
- **ถูกเรียกใช้งานโดย**:
  - `app/components/customer/MenuClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/ui/Button.tsx`
  - `app/components/ui/SafeImage.tsx`
  - `app/lib/utils.ts`

#### 26. `frontend/app/components/customer/LandingView.tsx`
- **หน้าที่การทำงาน**:
  - หน้าต้อนรับและภาพรวมของร้านสำหรับลูกค้า แสดงชื่อร้าน, โลโก้, เวลาเปิด-ปิด, เมนูตัวอย่างยอดนิยม (`sample_menus`), ปุ่มเริ่มสั่งอาหาร, และปุ่มดูช่องทางติดต่อร้านค้า
- **ถูกเรียกใช้งานโดย**:
  - `app/components/customer/MenuClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/RestaurantContactModal.tsx`
  - `app/components/ui/SafeImage.tsx`

#### 27. `frontend/app/components/customer/PaymentCheckoutView.tsx`
- **หน้าที่การทำงาน**:
  - หน้าจอสรุปรายการในตะกร้าและชำระเงิน:
    - เลือกเวลารับสินค้า (รับทันที หรือระบุเวลานัดรับล่วงหน้าผ่าน `PickupTimeSelector`)
    - เลือกวิธีการชำระเงิน (PromptPay QR หรือ เงินสดหน้าร้าน)
    - แสดง QR Code พร้อมเพย์ตามยอดเงินรวม
    - ฟังก์ชันอัปโหลดภาพสลิปโอนเงิน พร้อมส่งไปตรวจสอบกับระบบ AI และแสดงสถานะผลการตรวจสอบแบบสด
- **ถูกเรียกใช้งานโดย**:
  - `app/components/customer/MenuClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/customer/PickupTimeSelector.tsx`
  - `app/components/customer/ConfirmOrderModal.tsx`
  - `app/lib/api/customer.api.ts`

#### 28. `frontend/app/components/customer/LiveOrderTrackingView.tsx`
- **หน้าที่การทำงาน**:
  - หน้าจอติดตามสถานะคิวคำสั่งซื้อแบบเรียลไทม์ของลูกค้า:
    - แสดงหมายเลขคิว (เช่น Q001), เวลารอโดยประมาณ, และจำนวนคิวก่อนหน้า
    - แสดงแถบ Progress Bar ความคืบหน้า (รอยืนยัน -> กำลังทำ -> เสร็จพร้อมรับ -> สำเร็จ)
    - แสดง QR Code สำหรับให้ร้านค้าสแกนเพื่อรับสินค้า
    - แจ้งเตือนกรณีเมนูของหมดและเปิดให้ลูกค้าเลือกเมนูอื่นทดแทนได้ทันที
- **ถูกเรียกใช้งานโดย**:
  - `app/components/customer/MenuClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/api/customer.api.ts`
  - `app/components/ui/Badge.tsx`

#### 29. `frontend/app/components/customer/OrderSuccessTokenView.tsx`
- **หน้าที่การทำงาน**:
  - หน้าจอแสดงผลความสำเร็จหลังจากส่งออเดอร์เรียบร้อย พร้อมแสดง Token รหัสออเดอร์สำหรับใช้เรียกดูคิวในภายหลัง
- **ถูกเรียกใช้งานโดย**:
  - `app/components/customer/MenuClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/ui/Button.tsx`

#### 30. `frontend/app/components/customer/PickupTimeSelector.tsx`
- **หน้าที่การทำงาน**:
  - คอมโพเนนต์ตัวเลือกเวลารับสินค้า ให้ลูกค้าเลือกระหว่าง "รับทันที (ASAP)" หรือ "นัดเวลารับล่วงหน้า (ระบุชั่วโมง/นาที)"
- **ถูกเรียกใช้งานโดย**:
  - `app/components/customer/PaymentCheckoutView.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 31. `frontend/app/components/customer/ConfirmOrderModal.tsx`
- **หน้าที่การทำงาน**:
  - โมดอลยืนยันรายการสั่งซื้อและยอดเงินรวมขั้นตอนสุดท้ายก่อนส่งคำสั่งซื้อเข้าสู่ระบบ
- **ถูกเรียกใช้งานโดย**:
  - `app/components/customer/PaymentCheckoutView.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/ui/Modal.tsx`

---

### กลุ่มไฟล์ที่ 6: คอมโพเนนต์ฝั่งร้านค้า (Restaurant Modals & Tools)

#### 32. `frontend/app/components/restaurant/OutOfStockModal.tsx`
- **หน้าที่การทำงาน**:
  - โมดอลสำหรับพนักงานในครัวเมื่อพบว่าวัตถุดิบหรือเมนูของออเดอร์นั้นหมด
  - สามารถเลือกทำเครื่องหมายว่าวัตถุดิบใดหมด พร้อมส่งการแจ้งเตือน Realtime ไปยังหน้าจอของลูกค้าเพื่อขอให้เปลี่ยนรายการ
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/queue/QueueClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/ui/Modal.tsx`
  - `app/lib/api/restaurant.api.ts`

#### 33. `frontend/app/components/restaurant/PauseStoreModal.tsx`
- **หน้าที่การทำงาน**:
  - โมดอลสำหรับตั้งค่าพักรับออเดอร์ชั่วคราว (เช่น พัก 15 นาที, 30 นาที, หรือ 1 ชั่วโมง เมื่อครัวทำไม่ทัน) พร้อมระบุเหตุผลในการพัก
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/queue/QueueClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/ui/Modal.tsx`

#### 34. `frontend/app/components/restaurant/InventoryModal.tsx`
- **หน้าที่การทำงาน**:
  - โมดอลสำหรับเปิดดูและปรับเปลี่ยนสถานะสต็อกวัตถุดิบ (มีของ, ใกล้หมด, หมด) อย่างรวดเร็ว
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/queue/QueueClient.tsx`
  - `app/(restaurant)/restaurant/settings/page.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/api/restaurant.api.ts`

#### 35. `frontend/app/components/restaurant/SalesSummaryModal.tsx`
- **หน้าที่การทำงาน**:
  - โมดอลสรุปยอดขายแบบย่อสำหรับดูสถิติเร็วจากหน้าจอคิว
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/queue/QueueClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/ui/Modal.tsx`

---

### กลุ่มไฟล์ที่ 7: คอมโพเนนต์ความปลอดภัยและโครงสร้างหน้าเว็บ (Auth & Layout Components)

#### 36. `frontend/app/components/auth/AdminGuard.tsx`
- **หน้าที่การทำงาน**:
  - Client-side Guard ทำหน้าที่ตรวจสอบสถานะการเข้าสู่ระบบ หากพบว่าไม่มี Token หรือ Token หมดอายุ จะสั่ง Redirect ไปยังหน้า `/login` ทันที
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/layout.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/api/auth.api.ts`

#### 37. `frontend/app/components/CustomerLoginModal.tsx` และ `FastLoginModal.tsx`
- **หน้าที่การทำงาน**:
  - โมดอลสำหรับให้ลูกค้าเข้าสู่ระบบหรือลงทะเบียนด่วนด้วยชื่อเล่นและเบอร์โทรศัพท์ เพื่อสะสมประวัติการสั่งซื้อและติดตามคิว
- **ถูกเรียกใช้งานโดย**:
  - `app/components/customer/MenuClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/customer-auth.ts`
  - `app/lib/api/customer.api.ts`

#### 38. `frontend/app/components/layout/RestaurantSidebar.tsx`
- **หน้าที่การทำงาน**:
  - แถบเมนูนำทางด้านข้างของฝั่งร้านค้า (Desktop Sidebar) ประกอบด้วยลิงก์ไปยัง หน้าจัดการคิว, สรุปยอดขาย, ข้อมูลร้านค้า, การตั้งค่า และปุ่มออกจากระบบ
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/layout.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/ui/LogoutModal.tsx`

#### 39. `frontend/app/components/layout/MobileNav.tsx` และ `CustomerBottomNav.tsx`
- **หน้าที่การทำงาน**:
  - แถบเมนูนำทางด้านล่างสำหรับหน้าจอสมาร์ตโฟน อำนวยความสะดวกในการกดใช้งานด้วยมือเดียว
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/layout.tsx`
  - `app/components/customer/MenuClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 40. `frontend/app/components/GoogleMapPicker.tsx` (และ `ui/GoogleMapPicker.tsx`)
- **หน้าที่การทำงาน**:
  - คอมโพเนนต์เลือกและปักหมุดพิกัดตำแหน่งร้านค้าบนแผนที่ พร้อมแปลงค่าพิกัด Latitude/Longitude
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/profile/page.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 41. `frontend/app/components/RestaurantContactModal.tsx`
- **หน้าที่การทำงาน**:
  - โมดอลแสดงข้อมูลช่องทางติดต่อร้านค้า (เบอร์โทร, Line OA, Facebook, แผนที่ Google Maps, และแอปเดลิเวอรี)
- **ถูกเรียกใช้งานโดย**:
  - `app/components/customer/LandingView.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/icons/SocialIcons.tsx`

#### 42. `frontend/app/components/ShopQRTab.tsx`
- **หน้าที่การทำงาน**:
  - คอมโพเนนต์แสดงผล QR Code ของร้านสำหรับให้ลูกค้าสแกนสั่งอาหารหน้าร้าน
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/profile/page.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 43. `frontend/app/components/LineBrowserRedirect.tsx`
- **หน้าที่การทำงาน**:
  - ตรวจสอบว่าผู้ใช้เปิดเว็บผ่าน In-App Browser ของแอป Line หรือไม่ หากใช่ จะทำการเปิดเบราว์เซอร์หลักของเครื่อง (External Browser เช่น Safari/Chrome) โดยอัตโนมัติ เพื่อป้องกันปัญหาการบล็อก Cookie และการแจ้งเตือนเสียง
- **ถูกเรียกใช้งานโดย**:
  - `app/layout.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

---

### กลุ่มไฟล์ที่ 8: คอมโพเนนต์ส่วนติดต่อผู้ใช้พื้นฐาน (UI Common Components)

#### 44. `frontend/app/components/ui/*.tsx`
- **รายชื่อไฟล์ย่อย**:
  - `Badge.tsx`: แสดงป้ายสถานะ (สถานะคิว, สถานะการชำระเงิน)
  - `BottomSheet.tsx`: โมดอลสไลด์ขึ้นจากด้านล่างสำหรับสมาร์ตโฟน
  - `Button.tsx`: ปุ่มกดมาตรฐานพร้อม Loading State และแอนิเมชันการกด
  - `Card.tsx`: กล่องคอนเทนเนอร์พร้อมสไตล์ Glassmorphism และขอบมน
  - `DatePicker.tsx`: ปฏิทินเลือกช่วงวันที่สำหรับดูรายงานยอดขาย
  - `GuidedTourModal.tsx`: โมดอลสอนการใช้งานระบบเบื้องต้น
  - `Input.tsx`: ช่องกรอกข้อมูลพร้อมการจัดการข้อผิดพลาดและไอคอน
  - `Loading.tsx`: ตัวแสดงสถานะกำลังโหลด
  - `LogoutModal.tsx`: โมดอลยืนยันการออกจากระบบ
  - `Modal.tsx`: ป๊อปอัปโมดอลมาตรฐานพร้อมลูกเล่นเบลอพื้นหลัง
  - `Pagination.tsx`: แถบเปลี่ยนหน้าสำหรับตารางข้อมูล
  - `SafeImage.tsx`: คอมโพเนนต์แสดงรูปภาพที่มีระบบ Fallback เมื่อรูปภาพปลายทางโหลดไม่สำเร็จ
  - `Select.tsx`: ตัวเลือก Dropdown
  - `Skeleton.tsx`: คอมโพเนนต์จำลองพื้นที่ขณะรอโหลดข้อมูล
  - `Tabs.tsx`: แถบสลับแท็บ
- **ถูกเรียกใช้งานโดย**:
  - คอมโพเนนต์และหน้าเพจทั้งหมดในระบบ
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/utils.ts`

#### 45. `frontend/app/components/skeletons/*.tsx`
- **รายชื่อไฟล์ย่อย**:
  - `AdminDashboardSkeleton.tsx`
  - `RestaurantLayoutSkeleton.tsx`
  - `RestaurantQueueSkeleton.tsx`
  - `RestaurantSettingsSkeleton.tsx`
  - `RestaurantSummarySkeleton.tsx`
- **หน้าที่การทำงาน**:
  - โครงสร้างหน้าจอจำลอง (Skeleton Loading) สำหรับแสดงผลระหว่างรอข้อมูลจากเซิร์ฟเวอร์ ช่วยยกระดับประสบการณ์ผู้ใช้งาน (UX)
- **ถูกเรียกใช้งานโดย**:
  - หน้าเพจฝั่งร้านค้าและหน้าเพจหลัก
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/components/ui/Skeleton.tsx`

---

### กลุ่มไฟล์ที่ 9: เลเยอร์บริการและการเชื่อมต่อข้อมูล (Lib & API Services)

#### 46. `frontend/app/lib/api/client.ts`
- **หน้าที่การทำงาน**:
  - HTTP Client กลาง พัฒนาบน Fetch API สำหรับส่งคำขอไปยัง API Gateway (`/api/v1`)
  - มีระบบจัดการ Base URL, การส่ง Header อัตโนมัติ, การจัดการ Credentials และ Error Interceptor
- **ถูกเรียกใช้งานโดย**:
  - `app/lib/api/auth.api.ts`
  - `app/lib/api/customer.api.ts`
  - `app/lib/api/restaurant.api.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/api/types.ts`

#### 47. `frontend/app/lib/api/customer.api.ts`
- **หน้าที่การทำงาน**:
  - รวมฟังก์ชันเรียก API ฝั่งลูกค้า:
    - `getTableInfo()`: ตรวจสอบข้อมูลร้านและโต๊ะ
    - `getCategories()`, `getCrusts()`, `getSampleMenus()`, `getMenuItems()`: ดึงข้อมูลเมนู
    - `placeOrder()`: ส่งคำสั่งซื้อ
    - `getLiveQueue()`: ดึงสถานะคิวสด
    - `verifySlip()`: ส่งสลิปให้ AI ตรวจสอบ
    - `replaceOutOfStockItem()`: เปลี่ยนเมนูของหมด
- **ถูกเรียกใช้งานโดย**:
  - `app/components/customer/*`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/api/client.ts`

#### 48. `frontend/app/lib/api/restaurant.api.ts`
- **หน้าที่การทำงาน**:
  - รวมฟังก์ชันเรียก API ฝั่งร้านค้า:
    - `getOrders()`: ดึงรายการคิว
    - `updateOrderStatus()`: เปลี่ยนสถานะออเดอร์
    - `cancelOrder()`: ยกเลิกออเดอร์
    - `markItemOutOfStock()`: แจ้งสินค้าหมด
    - `getSalesSummary()`: ดึงข้อมูลสรุปยอดขาย
    - `getProfile()`, `updateProfile()`: ดึงและบันทึกข้อมูลร้านค้า
    - `toggleStoreStatus()`: เปิด-ปิดร้าน หรือพักรับออเดอร์
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/*`
  - `app/components/restaurant/*`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/api/client.ts`

#### 49. `frontend/app/lib/api/auth.api.ts`
- **หน้าที่การทำงาน**:
  - รวมฟังก์ชันเรียก API ด้านการยืนยันตัวตน:
    - `login()`: เข้าสู่ระบบร้านค้า
    - `getMe()`: ดึงข้อมูลผู้ใช้งานปัจจุบัน
    - `logout()`: ล้างเซสชันและออกจากระบบ
- **ถูกเรียกใช้งานโดย**:
  - `app/login/page.tsx`
  - `app/components/auth/AdminGuard.tsx`
  - `app/components/ui/LogoutModal.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/api/client.ts`

#### 50. `frontend/app/lib/useRestaurantRealtime.ts`
- **หน้าที่การทำงาน**:
  - Custom React Hook สำหรับจัดการ Server-Sent Events (SSE) ฝั่งร้านค้า:
    - เชื่อมต่อกับ `/api/v1/realtime/events`
    - ฟัง Event ออเดอร์ใหม่ (`NEW_ORDER`) แล้วส่งสัญญาณเล่นเสียงกระดิ่งเตือน
    - ฟัง Event การอัปเดตสถานะ (`ORDER_STATUS_CHANGED`)
    - มีฟังก์ชันเล่นเสียงเรียกคิวภาษาไทย (`speakOrderVoiceAnnouncement`) ผ่าน Web Speech API / TTS Server
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/RestaurantProvider.tsx`
  - `app/(restaurant)/restaurant/queue/QueueClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `app/lib/AudioAlertService.ts`

#### 51. `frontend/app/lib/AudioAlertService.ts`
- **หน้าที่การทำงาน**:
  - บริการจัดการไฟล์เสียงและ Synthesizer:
    - สังเคราะห์เสียงกระดิ่งแจ้งเตือน (Chime Sound) ด้วย Web Audio API Oscillator
    - เล่นไฟล์เสียงแจ้งเตือนออเดอร์ใหม่และยอดเงินเข้า
- **ถูกเรียกใช้งานโดย**:
  - `app/lib/useRestaurantRealtime.ts`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 52. `frontend/app/lib/excelExport.ts`
- **หน้าที่การทำงาน**:
  - ยูทิลิตี้สำหรับแปลงข้อมูลสรุปยอดขาย รายการออเดอร์ และสถิติสินค้าขายดี ให้ออกมาเป็นไฟล์ตารางคำนวณ Microsoft Excel (`.xlsx`) และดาวน์โหลดลงเครื่องอัตโนมัติ
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/summary/SummaryClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**:
  - `xlsx` library

#### 53. `frontend/app/lib/utils.ts`
- **หน้าที่การทำงาน**:
  - รวบรวมฟังก์ชันอเนกประสงค์:
    - `cn()`: รวมคลาส Tailwind CSS ด้วย `clsx` และ `tailwind-merge`
    - `parseCrepeDetails()`: แยกวิเคราะห์ข้อความออเดอร์เครป (แป้ง, ไส้, ความกรอบ, ท็อปปิ้ง)
    - `formatPrice()`: แปลงตัวเลขเป็นสกุลเงินบาท
    - `getRelativeTime()`: แปลงวันเวลาเป็นรูปแบบเวลาสัมพัทธ์ภาษาไทย (เช่น 5 นาทีที่แล้ว)
- **ถูกเรียกใช้งานโดย**:
  - คอมโพเนนต์และหน้าเพจเกือบทั้งหมดในระบบ
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 54. `frontend/app/lib/theme.ts`
- **หน้าที่การทำงาน**:
  - คำนวณและปรับเปลี่ยน CSS Variables ของธีมสีร้านค้าแบบ Dynamic ตามที่ตั้งค่าไว้ในฐานข้อมูล
- **ถูกเรียกใช้งานโดย**:
  - `app/(restaurant)/restaurant/RestaurantProvider.tsx`
  - `app/components/customer/MenuClient.tsx`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

#### 55. `frontend/app/lib/customer-auth.ts` และ `customer-session.ts`
- **หน้าที่การทำงาน**:
  - จัดการข้อมูลประจำตัวและเซสชันของลูกค้าใน LocalStorage (เบอร์โทรศัพท์, ชื่อเล่น, รหัสประจำตัวลูกค้า, ประวัติออเดอร์ล่าสุด)
- **ถูกเรียกใช้งานโดย**:
  - `app/components/customer/*`
- **ไฟล์ที่ถูกเรียกใช้ต่อ**: ไม่มี

---

## 5. แผนภาพวงจรการทำงานของผู้ใช้และร้านค้า (User Journey & Workflow)

### 5.1 วงจรการใช้งานของลูกค้า (Customer Journey)
1. ลูกค้าเข้าสู่ระบบผ่านลิงก์หรือสแกน QR Code หน้าแรก (`app/page.tsx` -> `MenuClient.tsx`)
2. รับชมข้อมูลร้านค้าและเมนูแนะนำ (`LandingView.tsx`)
3. เลือกประกอบเครปตามความชอบ เลือกแป้ง ความกรอบ และไส้ (`CustomCrepeBuilder.tsx`)
4. ตรวจสอบรายการในตะกร้า เลือกเวลานัดรับ และเลือกวิธีชำระเงิน (`PaymentCheckoutView.tsx`)
5. สแกนจ่ายผ่าน QR Code พร้อมเพย์ และอัปโหลดสลิปการโอน
6. ระบบนำทางเข้าสู่หน้าจอติดตามคิวสด (`LiveOrderTrackingView.tsx`) เพื่อรอดูสถานะและเวลาเสร็จแบบเรียลไทม์

### 5.2 วงจรการทำงานของห้องครัวและร้านค้า (Kitchen Workflow)
1. เจ้าของร้านหรือพนักงานล็อกอินเข้าสู่ระบบ (`app/login/page.tsx`)
2. เปิดหน้าจอแดชบอร์ดจัดการคิวคำสั่งซื้อ (`QueueClient.tsx`)
3. เมื่อมีออเดอร์ใหม่เข้ามา ระบบจะส่งสัญญาณ SSE และส่งเสียงเตือน Chime
4. พนักงานตรวจสอบรายการเครปและสถานะการชำระเงิน จากนั้นกดยืนยันรับออเดอร์
5. เมื่อเริ่มทำเครป พนักงานกดปุ่ม "เริ่มปรุง" (สถานะเปลี่ยนเป็น Cooking)
6. เมื่อทำเสร็จ พนักงานกดปุ่ม "เสร็จสิ้น" ระบบจะส่งเสียงประกาศเรียกคิวภาษาไทย (TTS) และส่งสัญญาณแจ้งเตือนไปยังหน้าจอโทรศัพท์ของลูกค้าทันที
7. เมื่อลูกค้ามารับสินค้า พนักงานกดยืนยันส่งมอบออเดอร์ (Completed)

---
