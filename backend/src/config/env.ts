import 'dotenv/config';

function req(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  NODE_ENV: req('NODE_ENV', 'development'),
  PORT: parseInt(req('PORT', '4000'), 10),
  DATABASE_URL: req('DATABASE_URL'),
  REDIS_URL: req('REDIS_URL', 'redis://localhost:6379'),
  FRONTEND_URL: req('FRONTEND_URL', 'http://localhost:3000'),
  JWT_ACCESS_SECRET: req('JWT_ACCESS_SECRET', 'dev-access-secret-change-me-32chars!!'),
  JWT_REFRESH_SECRET: req('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me-32chars!'),
  GEMINI_API_KEY: req('GEMINI_API_KEY'),
  GEMINI_MODEL: req('GEMINI_MODEL', 'gemini-1.5-flash'),
  CLOUDINARY_CLOUD_NAME: req('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: req('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: req('CLOUDINARY_API_SECRET'),
  isProd: (process.env.NODE_ENV === 'production'),
};
