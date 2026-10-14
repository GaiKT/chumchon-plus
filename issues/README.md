# รายการงาน Chumchon Plus รุ่นแรก (v1)

- **AFK** = agent ทำได้เองจนเสร็จ (`status: ready-for-agent`)
- **HITL** = ต้องมีคนลงมือหรือตัดสินใจบางส่วน (`status: ready-for-human`)

| # | งาน | ประเภท | ขึ้นกับ |
|---|---|---|---|
| [01](01-walking-skeleton.md) | ✅ โครงระบบพื้นฐาน (walking skeleton) | AFK | — |
| [02](02-password-login-and-tenant.md) | ✅ เข้าสู่ระบบด้วยรหัสผ่าน และกำหนดหมู่บ้านจาก session | AFK | 01 |
| [03](03-cross-tenant-isolation-tests.md) | ✅ ชุดทดสอบการแยกข้อมูลระหว่างหมู่บ้าน | AFK | 02 |
| [04](04-search-by-name.md) | ✅ ค้นหาด้วยชื่อ นามสกุล หรือชื่อเล่น | AFK | 02 |
| [05](05-search-by-house-number.md) | ✅ ค้นหาด้วยบ้านเลขที่ | AFK | 04 |
| [06](06-fuzzy-search.md) | ✅ ค้นหาได้แม้พิมพ์ผิดเล็กน้อย | AFK | 04 |
| [07](07-household-detail.md) | ✅ หน้ารายละเอียดครัวเรือน | AFK | 04 |
| [08](08-copy-and-call.md) | ✅ ปุ่มคัดลอกข้อมูลและโทรออก | AFK | 07 |
| [09](09-edit-with-audit-log.md) | ✅ แก้ไขข้อมูล พร้อมบันทึกประวัติการแก้ไข | AFK | 07 |
| [10](10-add-and-status-change.md) | ✅ เพิ่มข้อมูล และเปลี่ยนสถานะ | AFK | 09 |
| [11](11-soft-delete-and-restore.md) | ✅ ลบข้อมูลที่ผิด และกู้คืนภายใน 30 วัน | AFK | 09 |
| [12](12-line-login-and-invite.md) | เข้าสู่ระบบด้วย LINE และเชิญผู้ใช้ด้วยลิงก์ | HITL | 02, 17 |
| [13](13-session-management.md) | จัดการอุปกรณ์ที่เข้าสู่ระบบ | AFK | 02 |
| [14](14-security-hardening.md) | เสริมความปลอดภัยของระบบ | AFK | 02 |
| [15](15-pwa-and-mobile-ui.md) | PWA และหน้าจอสำหรับมือถือ | AFK | 01 |
| [16](16-fake-data-seed-for-staging.md) | ข้อมูลทดสอบ 500 คนสำหรับ staging | AFK | 01 |
| [17](17-deploy-home-server.md) | Deploy ขึ้น home server ผ่าน Cloudflare Tunnel | HITL | 01 |
| [18](18-backup-and-monitoring.md) | สำรองข้อมูลนอกสถานที่ และแจ้งเตือนเมื่อระบบล่ม | HITL | 17 |
| [19](19-pilot-preparation.md) | เตรียมทดลองใช้งานจริงกับหมู่บ้านนำร่อง | HITL | 03–14, 18 |
