import path from "path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // 🔑 força Webpack explicitamente
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
    }
    return config
  },
}

export default nextConfig
