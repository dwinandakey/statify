/** @jest-environment node */

const nextConfig = require('../next.config');

describe('backend proxy after integration', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  test.each([
    ['development', undefined, 'http://localhost:5000/api/:path*'],
    ['production', undefined, 'http://statify-backend:5000/api/:path*'],
    ['development', 'http://localhost:5000', 'http://localhost:5000/api/:path*'],
    ['production', 'http://backend:5000/api/', 'http://backend:5000/api/:path*'],
  ])('routes API requests for %s with backend %s', async (mode, backend, destination) => {
    process.env = { ...originalEnv, NODE_ENV: mode };
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backend !== undefined) process.env.NEXT_PUBLIC_BACKEND_URL = backend;

    expect(await nextConfig.rewrites()).toEqual([{ source: '/api/:path*', destination }]);
  });

  it('preserves isolation headers required by threaded WebAssembly', async () => {
    expect(await nextConfig.headers()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: '/(.*)',
        headers: expect.arrayContaining([
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ]),
      }),
    ]));
  });
});
