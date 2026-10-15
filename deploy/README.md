# Deploy ขึ้น home server

ระบบรันบน home server ด้วย Docker Compose และเปิดให้เข้าจากอินเทอร์เน็ตผ่าน **Tailscale Funnel** (HTTPS ฟรี ไม่ต้องเปิด port ที่ router ไม่ต้องมี domain) เมื่อมี domain แล้วค่อยเปลี่ยนเป็น Cloudflare Tunnel ได้ (#17)

- production: `https://chumchon.<ชื่อ tailnet>.ts.net`
- staging (ข้อมูลปลอม): `https://chumchon-staging.<ชื่อ tailnet>.ts.net`

ทั้งสองแยก Compose project, ฐานข้อมูล, รหัสผ่าน และ Tailscale node กัน ไฟล์บน server อยู่ที่ `~/chumchon/<production|staging>/` และ `.env` ในนั้นมีรหัสผ่านที่สร้างบน server เอง **ห้ามคัดลอกออกมา**

ทุกคำสั่งรันจากเครื่องที่ ssh เข้า server ได้ (`myserver` ใน `~/.ssh/config` เปลี่ยนได้ด้วย `DEPLOY_HOST`) ใช้ Git Bash บน Windows ได้

## ตั้งค่าครั้งแรก (ทำครั้งเดียว)

1. สมัคร [Tailscale](https://login.tailscale.com) ด้วยบัญชีกลางของหมู่บ้าน
2. ใน admin console:
   - **DNS** → เปิด MagicDNS และ HTTPS Certificates
   - **Access controls** → เพิ่ม Funnel ให้เครื่องในบัญชี (ตัวอย่างใน policy file เริ่มต้นมีให้ uncomment: `"nodeAttrs": [{"target": ["autogroup:member"], "attr": ["funnel"]}]`)
   - **Settings → Keys** → Generate auth key แบบ Reusable (ใช้ได้ทั้ง production และ staging)
3. รัน deploy ครั้งแรก ระบบจะสร้าง `~/chumchon/production/.env` แล้วหยุดเพราะยังไม่มี key:
   ```sh
   deploy/ctl.sh production deploy
   ```
4. ใส่ key บน server เอง (อย่าวางใน chat หรือ commit):
   ```sh
   ssh myserver
   nano ~/chumchon/production/.env   # ใส่ค่าหลัง TS_AUTHKEY=
   ```
5. รัน `deploy/ctl.sh production deploy` อีกครั้ง ระบบจะบอก address ที่ใช้เข้า
6. ใน Tailscale admin console → Machines → เครื่อง `chumchon` → **Disable key expiry** (ไม่อย่างนั้น 180 วันแล้ว URL จะใช้ไม่ได้)
7. สร้างหมู่บ้านและบัญชีผู้ใหญ่บ้าน รหัสผ่านจะแสดงครั้งเดียว ให้ส่งมอบต่อหน้า:
   ```sh
   deploy/ctl.sh production run village:create --name "บ้านตัวอย่าง" --moo 5 --subdistrict "..." --district "..." --province "..."
   deploy/ctl.sh production run user:create --role admin --village <village-id> --username <ชื่อผู้ใช้> --name "<ชื่อ-สกุล>"
   ```

staging ทำแบบเดียวกันโดยเปลี่ยน `production` เป็น `staging` แล้วใส่ข้อมูลปลอม 500 คนด้วย `deploy/ctl.sh staging run seed:fake`

## Deploy เวอร์ชันใหม่

commit ก่อน แล้วรัน:

```sh
deploy/ctl.sh production deploy
```

ระบบส่ง source ของ commit ล่าสุดไป build บน server, รัน migration แล้วสลับไปเวอร์ชันใหม่ ถ้าแอปไม่ขึ้นสถานะ healthy ภายใน 2 นาทีคำสั่งจะแจ้ง error

## Rollback

```sh
deploy/ctl.sh production rollback          # กลับไปเวอร์ชันก่อนหน้า
deploy/ctl.sh production rollback <tag>    # กลับไปเวอร์ชันที่ระบุ (ดู tag จาก status หรือ git log)
```

**migration ของฐานข้อมูลไม่ถูกย้อนกลับ** ใช้ rollback ได้เมื่อเวอร์ชันเก่ายังเข้ากับ schema ใหม่ (migration ที่เพิ่ม column หรือ table) ถ้า migration ลบหรือเปลี่ยนชื่อ column ต้อง restore จาก backup (#18)

## คำสั่งอื่น

```sh
deploy/ctl.sh production status                       # เวอร์ชัน, address, สถานะ container
deploy/ctl.sh production logs app                     # log 100 บรรทัดล่าสุด (ไม่มีข้อมูลลูกบ้าน)
deploy/ctl.sh production import <village-id> data.csv # นำเข้าลูกบ้านจาก CSV แล้วลบไฟล์จาก server ทันที
```

ข้อมูลที่ลบเกิน 30 วันถูกลบถาวรวันละครั้งโดย service `purge` ไม่ต้องตั้ง cron

## ยังไม่ได้ทำ

- **disk ของ server ไม่ได้เข้ารหัส** (#17) ถ้าเครื่องถูกขโมย ข้อมูลในฐานข้อมูลอ่านได้ การเข้ารหัสทั้ง disk ต้องติดตั้ง Ubuntu ใหม่พร้อม LUKS ควรทำก่อนนำข้อมูลจริงเข้า
- backup นอกเครื่องและแจ้งเตือนเมื่อระบบล่ม (#18)
- เมื่อย้ายจาก `.ts.net` ไปใช้ domain ของหมู่บ้าน URL จะเปลี่ยน ผู้ใช้ต้องเข้าสู่ระบบและติดตั้งแอปบนมือถือใหม่
