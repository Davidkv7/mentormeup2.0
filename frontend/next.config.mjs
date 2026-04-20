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
    'mentor-hub-141.preview.emergentagent.com',
    '*.preview.emergentagent.com',
    '*.preview.emergentcf.cloud',
    'a0364a8f-3654-4c6f-a5ea-4b264d1b18e2.cluster-0.preview.emergentcf.cloud',
    'a0364a8f-3654-4c6f-a5ea-4b264d1b18e2.cluster-5.preview.emergentcf.cloud',
    'mentor-hub-141.cluster-0.preview.emergentcf.cloud',
    'mentor-hub-141.cluster-5.preview.emergentcf.cloud',
  ],
}

export default nextConfig
