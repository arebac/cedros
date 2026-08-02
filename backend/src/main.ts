import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const allowedMethods = new Set(['GET', 'POST', 'OPTIONS', 'HEAD']);
const rateLimitBuckets = new Map<string, RateLimitBucket>();

function getClientIp(req: any): string {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '');
  return forwardedFor.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || 'unknown';
}

function applySecurityMiddleware(app: any) {
  const server = app.getHttpAdapter().getInstance();
  server.disable?.('x-powered-by');
  server.set?.('trust proxy', 1);

  app.use((req: any, res: any, next: () => void) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");

    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }

    if (!allowedMethods.has(req.method)) {
      res.setHeader('Allow', Array.from(allowedMethods).join(', '));
      res.status(405).json({ message: 'Method Not Allowed', statusCode: 405 });
      return;
    }

    const now = Date.now();
    const windowMs = 60_000;
    const limit = req.path?.startsWith('/api/auth/login') ? 10 : 240;
    const key = `${getClientIp(req)}:${req.path?.startsWith('/api/auth/login') ? 'auth' : 'api'}`;
    const bucket = rateLimitBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ message: 'Too many requests', statusCode: 429 });
      return;
    }

    next();
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  applySecurityMiddleware(app);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const configuredOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const devOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ];

  const corsOrigins = process.env.NODE_ENV === 'production'
    ? configuredOrigins
    : Array.from(new Set([...configuredOrigins, ...devOrigins]));

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  });

  await app.listen(process.env.PORT || 3001, '0.0.0.0');
}
bootstrap();
