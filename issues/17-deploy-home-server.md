---
id: 17
title: Deploy ขึ้น home server ผ่าน Cloudflare Tunnel
type: HITL
status: ready-for-human
---

## สิ่งที่ต้องทำ

นำระบบขึ้นใช้งานจริงบน home server (Linux) ให้เข้าถึงได้ทาง HTTPS ด้วย domain คงที่ โดยไม่เปิด port ที่ router

**ส่วนที่ต้องทำโดยคน (HITL):**
- ซื้อ domain ด้วยบัญชีกลางของหมู่บ้าน
  - ดูราคาต่ออายุ ไม่ใช่ราคาปีแรก
  - ต้องเปลี่ยน nameserver ไป Cloudflare ได้
- เพิ่ม domain เข้า Cloudflare และสร้าง tunnel
- เปิด disk encryption บน server ตั้ง auto security update และใช้ SSH key เท่านั้น
- ติดตั้ง Docker บน server

**ส่วนที่ทำโดย agent:**
- Dockerfile สำหรับ Next.js standalone
- Docker Compose สำหรับ production มี `app`, `db` และ `cloudflared`
  - `db` ไม่เปิด port ออกนอก Docker network
  - volume ของ `db` แยกชัดเจน
- แยก env ของ production กับ staging และมีไฟล์ตัวอย่าง env ที่ไม่มีค่าลับ
- รัน migration อัตโนมัติก่อน start แอป
- staging ใช้ compose ชุดเดียวกัน แต่แยก project, ฐานข้อมูล และ subdomain
- เอกสารขั้นตอน deploy และ rollback สั้นๆ

## เกณฑ์ตรวจรับ

- [ ] เปิดเว็บผ่าน domain ด้วย HTTPS ได้จากเน็ตมือถือ
- [ ] router ไม่มี port forward และ Postgres เข้าถึงจากนอก server ไม่ได้
- [ ] staging กับ production แยกฐานข้อมูลกัน
- [ ] deploy เวอร์ชันใหม่ได้ด้วยคำสั่งเดียว และ rollback ได้
- [ ] domain และ Cloudflare อยู่ภายใต้บัญชีกลางของหมู่บ้าน

## ขึ้นกับ

- #01
