import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pejuang/shared"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
