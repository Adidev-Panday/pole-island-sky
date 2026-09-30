import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The home directory (parent of this project) has its own unrelated
  // package.json/lockfile, which otherwise makes Next.js misdetect the
  // workspace root.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
