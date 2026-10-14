import { renderAppIcon } from "@/lib/app-icon";

export const contentType = "image/png";

// 192 and 512 are the sizes Android needs to install the app.
export function generateImageMetadata() {
  return [192, 512].map((size) => ({ id: String(size), size: { width: size, height: size }, contentType }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  return renderAppIcon(Number(await id));
}
