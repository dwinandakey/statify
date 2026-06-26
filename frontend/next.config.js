const path = require('path');

const driveRoot = path.parse(__dirname).root;
const windowsSystemWatchIgnores = [
    path.join(driveRoot, 'pagefile.sys'),
    path.join(driveRoot, 'swapfile.sys'),
    path.join(driveRoot, 'hiberfil.sys'),
    path.join(driveRoot, 'System Volume Information'),
    path.join(driveRoot, '$RECYCLE.BIN'),
].map((entry) => entry.replace(/\\/g, '/'));

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-dev',
    
    webpack: (config, { isServer }) => {
        // Include root node_modules for npm workspaces hoisted packages
        config.resolve.modules = [
            path.resolve(__dirname, '..', 'node_modules'),
            'node_modules',
        ];

        config.watchOptions = {
            ...config.watchOptions,
            ignored: [
                '**/node_modules/**',
                '**/.next/**',
                '**/.next-dev/**',
                '**/dist/**',
                '**/target/**',
                '**/pagefile.sys',
                '**/swapfile.sys',
                '**/hiberfil.sys',
                '**/System Volume Information/**',
                '**/$RECYCLE.BIN/**',
                ...windowsSystemWatchIgnores,
                ...windowsSystemWatchIgnores.map((entry) => `${entry}/**`),
            ],
        };

        // The dashboard client layout bundle is large in development mode.
        // Increase timeout to avoid false-positive ChunkLoadError on slower rebuilds.
        if (!isServer) {
            config.output.chunkLoadTimeout = 300000;
        }

        if (!isServer) {
            config.module.rules.push({
                test: /\.worker\.(js|ts)$/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        filename: 'static/[hash].worker.js',
                        publicPath: '/_next/',
                    }
                },
            });
        }

        // Add WASM file handling
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
        };

        config.output.globalObject = 'self';

        return config;
    },
    // Required for SharedArrayBuffer which wasm-bindgen-rayon needs for
    // multi-threaded WebAssembly.  Must be present on every response so the
    // browser marks the context as "cross-origin isolated".
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
                    { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
                ],
            },
        ];
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://backend:5000/api/:path*'
            }
        ];
    },
    async redirects() {
        return [
            {
                source: '/data',
                destination: '/dashboard/data',
                permanent: true,
            },
            {
                source: '/data/:path*',
                destination: '/dashboard/data/:path*',
                permanent: true,
            },
            {
                source: '/result',
                destination: '/dashboard/result',
                permanent: true,
            },
            {
                source: '/results',
                destination: '/dashboard/results',
                permanent: true,
            },
            {
                source: '/variables',
                destination: '/dashboard/variables',
                permanent: true,
            }
        ];
    },
}

module.exports = nextConfig
