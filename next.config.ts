import type { NextConfig } from "next";

const repo = "pieza-a-pieza"; // debe coincidir con el nombre del repositorio
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isProd ? `/${repo}` : "",
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? `/${repo}` : "",
  },
};

export default nextConfig;