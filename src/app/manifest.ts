import type { MetadataRoute } from "next";
import { BASE } from "@/lib/base";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pieza a pieza",
    short_name: "Pieza a pieza",
    description: "Seguimiento compartido para familias y profesionales",
    lang: "es",
    start_url: `${BASE}/`,
    scope: `${BASE}/`,
    display: "standalone",
    background_color: "#f6f8f4",
    theme_color: "#426f5d",
    icons: [
      { src: `${BASE}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BASE}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${BASE}/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}