---
id: 01
title: โครงระบบพื้นฐาน (walking skeleton) ตั้งแต่ฐานข้อมูลถึงหน้าจอ
type: AFK
status: done
---

## สิ่งที่ต้องทำ

สร้างโครงโปรเจกต์ที่ทำงานได้ครบทุกชั้นตั้งแต่ฐานข้อมูลถึงหน้าจอ เพื่อเป็นฐานให้งานอื่นต่อยอด

- Next.js (App Router) + TypeScript build แบบ `output: "standalone"`
- Docker Compose สำหรับ dev มี `app` และ `db` (PostgreSQL 16 + extension `pg_trgm`) โดย `db` ไม่เปิด port ออกนอก Docker network ยกเว้นตอน dev บนเครื่อง local
- Drizzle schema และ migration สำหรับตาราง `villages`, `households`, `persons`
  - `villages`: ชื่อหมู่บ้าน, หมู่ที่, ตำบล, อำเภอ, จังหวัด
  - `households`: `village_id`, บ้านเลขที่, คุ้ม/ซอย, หัวหน้าครัวเรือน, หมายเหตุ
  - `persons`: `village_id`, `household_id`, คำนำหน้า, ชื่อ, สกุล, ชื่อเล่น, ความสัมพันธ์กับหัวหน้าครัวเรือน, วันเกิด, เบอร์โทร, หมายเหตุ, `status` (อาศัยอยู่ / ย้ายออก / เสียชีวิต), `deleted_at`
  - `UNIQUE (village_id, house_no)`
- เปิด Row-Level Security ทุกตารางที่มีข้อมูลลูกบ้าน ด้วย policy `village_id = current_setting('app.village_id')`
  - แอปเชื่อมต่อด้วย role ที่ไม่ใช่ owner และไม่มี `BYPASSRLS`
- helper สำหรับรัน query ใน transaction ที่ `SET LOCAL app.village_id` ก่อนทุกครั้ง ในขั้นนี้รับ village จาก env ชั่วคราว
- template spreadsheet (1 แถว = 1 คน มีคอลัมน์บ้านเลขที่สำหรับจัดกลุ่มเป็นครัวเรือน) และ Zod schema ที่ใช้ validate แถวข้อมูล
- seed script แบบ CLI อ่านไฟล์ CSV ตาม template แล้ว validate ด้วย Zod schema ก่อนบันทึก ถ้ามีแถวผิดให้แจ้งเลขแถวและเหตุผล และไม่บันทึกอะไรเลย
- หน้ารายชื่อลูกบ้านแบบง่ายของหมู่บ้านที่กำหนด

## เกณฑ์ตรวจรับ

- [x] `docker compose up` แล้วเปิดหน้ารายชื่อเห็นข้อมูลที่ seed ไว้
- [x] seed script ปฏิเสธไฟล์ที่มีแถวผิด พร้อมแจ้งเลขแถวและเหตุผล
- [x] query ที่ไม่ได้ `SET LOCAL app.village_id` ได้ผลลัพธ์ว่าง (RLS ทำงาน)
- [x] แอปเชื่อมต่อฐานข้อมูลด้วย role ที่ไม่มี `BYPASSRLS`
- [x] มี test ของ Zod schema ด้วย Vitest

## ขึ้นกับ

ไม่มี เริ่มได้ทันที
