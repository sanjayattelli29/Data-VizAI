/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'designwithsanjay.site',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'res.cloudinary.com'
    ],
  },
  // Use the correct configuration for Next.js 15+
  transpilePackages: ['mongoose'],
}

module.exports = nextConfig
