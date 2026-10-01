import { rateLimit, type Options } from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// Brute-force protection on the credential endpoints (GDPR art. 32). Limits
// are per client IP, which relies on `trust proxy` (set in main.ts) since the
// backend only ever sits behind nginx. RATE_LIMIT_DISABLED=true turns them
// off for local load or end-to-end testing.
function limiter(windowMs: number, limit: number, options: Partial<Options>) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => process.env.RATE_LIMIT_DISABLED === "true",
    message: {
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many attempts, please try again later.",
      },
    },
    ...options,
  });
}

// Only failed attempts count, so a user who signs in normally is never locked.
export const loginRateLimit = limiter(FIFTEEN_MINUTES, 10, {
  skipSuccessfulRequests: true,
});

export const passwordChangeRateLimit = limiter(FIFTEEN_MINUTES, 10, {
  skipSuccessfulRequests: true,
});

export const registerRateLimit = limiter(ONE_HOUR, 20, {});
