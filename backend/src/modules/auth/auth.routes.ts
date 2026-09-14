import { Router } from "express";
import { AuthController } from "./AuthController.js";
import { AuthService } from "./AuthService.js";
import { PrismaUserRepository } from "../users/PrismaUserRepository.js";
import { prisma } from "../../shared/database/prisma.js";
import { requireAuth } from "../../shared/security/requireAuth.js";

const router = Router();

const userRepository = new PrismaUserRepository(prisma);
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.get("/me", requireAuth, authController.getProfile);
router.post("/logout", requireAuth, authController.logout);

export default router;
