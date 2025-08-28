/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false, // Désactiver pour éviter les problèmes HMR avec React 19
    experimental: {
        serverActions: {
            bodySizeLimit: '20mb'
        },
        optimizeCss: false, // Désactiver pour éviter les conflits
    },
    compiler: {
        emotion: true
    },
    output: 'standalone',
    trailingSlash: false,
    poweredByHeader: false,
    compress: true,
    async generateBuildId() {
        return `lims-build-${Date.now()}`
    }
};

export default nextConfig;
