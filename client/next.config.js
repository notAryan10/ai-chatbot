/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
        domains: ['localhost'],
    },
    typescript: {
        // This will allow production builds to continue even with TS errors
        ignoreBuildErrors: true,
    },
    eslint: {
        // This will allow production builds to continue even with ESLint errors
        ignoreDuringBuilds: true,
    }
}

module.exports = nextConfig 