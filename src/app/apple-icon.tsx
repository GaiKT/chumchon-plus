import { renderAppIcon } from "@/lib/app-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself and does not crop, so less padding.
export default function AppleIcon() {
  return renderAppIcon(size.width, { padding: 0.1 });
}
