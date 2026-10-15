import { ImageResponse } from "next/og";

export const THEME_COLOR = "#172554";

/**
 * The app icon: a white house with a magnifying glass on brand navy.
 * Drawn as SVG so it needs no image files or fonts. `padding` leaves the
 * safe zone that maskable icons need (Android may crop to a circle).
 */
export function renderAppIcon(size: number, { padding = 0.18 } = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: THEME_COLOR,
        }}
      >
        <svg width={inner} height={inner} viewBox="0 0 100 100">
          <path d="M50 12 L90 46 L80 46 L80 86 L20 86 L20 46 L10 46 Z" fill="#ffffff" />
          <circle cx="48" cy="60" r="13" fill="none" stroke={THEME_COLOR} strokeWidth="7" />
          <line x1="57" y1="70" x2="67" y2="80" stroke={THEME_COLOR} strokeWidth="8" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
