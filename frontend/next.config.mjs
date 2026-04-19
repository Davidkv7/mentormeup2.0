/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    'a0364a8f-3654-4c6f-a5ea-4b264d1b18e2.preview.emergentagent.com',
    'a0364a8f-3654-4c6f-a5ea-4b264d1b18e2.cluster-0.preview.emergentcf.cloud',
    '*.preview.emergentagent.com',
    '*.preview.emergentcf.cloud',
  ],
}

export default nextConfig
