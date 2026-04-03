// Copyright 2025 Leon Xia. MIT License.
// Cloudflare Worker: security headers, caching, and www→apex redirect.

interface Env {
  ASSETS: {
    fetch: (input: RequestInit, init?: RequestInit) => Promise<Response>;
  };
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://assets.dogitect.io",
    "font-src 'self'",
    "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://assets.dogitect.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; '),
};

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

const HTML_CACHE = 'public, max-age=0, must-revalidate';

const STATIC_CACHE = 'public, max-age=3600, s-maxage=86400';

function getCacheControl(pathname: string): string {
  if (/\.[a-f0-9]{8,}\.\w+$/.test(pathname)) {
    return IMMUTABLE_CACHE;
  }
  if (
    /\.(js|css|woff2?|ttf|eot|svg|png|jpe?g|gif|webp|avif|ico|webmanifest|json|xml|txt)$/.test(
      pathname
    )
  ) {
    return STATIC_CACHE;
  }
  return HTML_CACHE;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === 'www.vellum.dogitect.io') {
      url.hostname = 'vellum.dogitect.io';
      return Response.redirect(url.toString(), 301);
    }

    const response = await env.ASSETS.fetch(request);
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Cache-Control', getCacheControl(url.pathname));

    const contentType = newHeaders.get('Content-Type') ?? '';
    if (contentType.includes('text/html')) {
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        newHeaders.set(key, value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
