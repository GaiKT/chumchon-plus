// Test-only accounts created by global-setup in the development database.
export const E2E_PASSWORD = "e2e-password-not-secret";

export const E2E = {
  villageName: "e2e-village-A",
  otherVillageName: "e2e-village-B",
  admin: { username: "e2e_admin", name: "ผู้ใหญ่บ้านทดสอบ" },
  superadmin: { username: "e2e_super", name: "ผู้ดูแลระบบทดสอบ" },
  resident: { title: "นาย", firstName: "ทดสอบหนึ่ง", lastName: "หมู่บ้านเอ", nickname: "จุก", birthDate: "1980-01-01" },
  otherResident: { firstName: "ทดสอบสอง", lastName: "หมู่บ้านบี" },
} as const;
