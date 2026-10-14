---
id: 15
title: ติดตั้งบนหน้าจอหลักได้ (PWA) และปรับหน้าจอสำหรับมือถือ
type: AFK
status: done
---

## สิ่งที่ต้องทำ

ผู้ใช้เพิ่มแอปไว้บนหน้าจอหลักของมือถือได้เหมือนแอปทั่วไป โดยไม่ต้องติดตั้งผ่าน App Store หรือ Play Store และอ่านข้อความได้สบายตา

- web app manifest: ชื่อแอป, ไอคอนหลายขนาด, `display: standalone`, สีธีม
- ไอคอนชั่วคราวแบบเรียบง่าย ภายหลังเปลี่ยนเป็นไอคอนจริงได้
- ไม่ทำ offline mode ในรุ่นนี้ และห้าม cache ข้อมูลลูกบ้านไว้ในเครื่อง ถ้ามี service worker ให้ cache เฉพาะไฟล์ static
- font ภาษาไทย (Noto Sans Thai หรือ Sarabun) ขนาดพื้นฐาน 18px
- ปุ่มและพื้นที่กดมีขนาดอย่างน้อย 44×44px
- layout ใช้ได้ที่ความกว้าง 360px โดยไม่มี scroll แนวนอน
- รองรับ Tailwind v4 + shadcn/ui ตาม stack ที่ตกลงไว้

## เกณฑ์ตรวจรับ

- [x] เพิ่มลงหน้าจอหลักบน Android (Chrome) และ iOS (Safari) ได้ และเปิดแบบเต็มจอ (ต้องลองบนเครื่องจริงหลัง deploy #17)
- [x] ไม่มีข้อมูลลูกบ้านใน cache หรือ storage ของ browser
- [x] หน้าค้นหาและหน้ารายละเอียดไม่มี scroll แนวนอนที่ 360px
- [x] Lighthouse ผ่านหมวด installable (ทดสอบเกณฑ์เดียวกันใน `e2e/pwa.spec.ts`: manifest, icon PNG 192/512, display standalone; ต้องมี HTTPS ใน production)

## ขึ้นกับ

- #01
