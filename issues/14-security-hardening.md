---
id: 14
title: เสริมความปลอดภัยของระบบ
type: AFK
status: ready-for-agent
---

## สิ่งที่ต้องทำ

ลดความเสี่ยงที่ข้อมูลลูกบ้านจะรั่วหรือถูกเข้าถึงโดยผู้ไม่ได้รับอนุญาต

- จำกัดจำนวนครั้งการเข้าสู่ระบบด้วยรหัสผ่าน (rate limit) ต่อ IP และต่อบัญชี
- ล็อกบัญชีชั่วคราว 15 นาที เมื่อใส่รหัสผ่านผิด 5 ครั้งติดกัน
- security headers: CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, `X-Content-Type-Options`
- `noindex, nofollow` ทั้งเว็บ ทั้งใน `robots.txt` และ meta/header
- log ของแอปห้ามมีข้อมูลส่วนบุคคล (ชื่อ เบอร์โทร คำค้น) บันทึกได้เฉพาะ id
- cookie ของ session ตั้งเป็น `HttpOnly`, `Secure`, `SameSite=Lax`

## เกณฑ์ตรวจรับ

- [ ] ใส่รหัสผ่านผิด 5 ครั้งแล้วถูกล็อก 15 นาที
- [ ] response มี security headers ครบตามรายการ
- [ ] `robots.txt` ปิดการ index ทั้งเว็บ
- [ ] ค้นหาแล้วตรวจ log ไม่พบคำค้นหรือชื่อลูกบ้าน
- [ ] cookie ของ session มี flag ครบ

## ขึ้นกับ

- #02
