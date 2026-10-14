import { describe, expect, it } from "vitest";
import { deviceLabel } from "./device";

describe("deviceLabel", () => {
  it.each([
    [
      "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 Line/14.10.0",
      "Android · LINE",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
      "Android · Chrome",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      "iPhone · Safari",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0",
      "Windows · Edge",
    ],
  ])("labels %s", (ua, expected) => {
    expect(deviceLabel(ua)).toBe(expected);
  });

  it("handles a missing user agent", () => {
    expect(deviceLabel(null)).toBe("ไม่ทราบอุปกรณ์");
  });
});
