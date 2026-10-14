import type { MetadataRoute } from "next";
import { THEME_COLOR } from "@/lib/app-icon";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ชุมชนพลัส",
    short_name: "ชุมชนพลัส",
    description: "ค้นหาข้อมูลลูกบ้าน",
    lang: "th",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: THEME_COLOR,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      // The icon keeps its artwork inside the safe zone, so it also works masked.
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
