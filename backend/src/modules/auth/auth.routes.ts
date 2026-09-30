import { Router } from "express";
import { AuthController } from "./AuthController.js";
import { AuthService } from "./AuthService.js";
import { PrismaUserRepository } from "../users/PrismaUserRepository.js";
import { prisma } from "../../shared/database/prisma.js";
import { requireAuth } from "../../shared/security/requireAuth.js";
import { validateSchema } from "../../shared/http/validateSchema.js";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "./auth.schema.js";

const router = Router();

const userRepository = new PrismaUserRepository(prisma);
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

router.post(
  "/register",
  validateSchema(registerSchema),
  authController.register,
);
router.post("/login", validateSchema(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.get("/me", requireAuth, authController.getProfile);
router.patch(
  "/me",
  requireAuth,
  validateSchema(updateProfileSchema),
  authController.updateProfile,
);
router.get("/me/stats", requireAuth, authController.getActivityStats);
router.post("/logout", requireAuth, authController.logout);

export default router;
