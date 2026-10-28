import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pieza a pieza",
    short_name: "Pieza a pieza",
    description: "Seguimiento compartido para familias y profesionales",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8f4",
    theme_color: "#426f5d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}