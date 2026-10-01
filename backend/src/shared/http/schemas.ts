import { z } from "zod";

// Emails are trimmed and lowercased before use, so "  Alice@X.com" signs in
// to the account registered as "alice@x.com".
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

// bcrypt only uses the first 72 bytes of a password: longer ones would be
// silently truncated, so they are refused instead.
const BCRYPT_MAX_BYTES = 72;

export const newPasswordSchema = z
  .string()
  .min(8)
  .refine((value) => Buffer.byteLength(value, "utf8") <= BCRYPT_MAX_BYTES, {
    message: `Password must be at most ${BCRYPT_MAX_BYTES} bytes long`,
  });
