import type { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "./AuthService.js";

const registerSchema = z.object({
  email: z.email(),
  name: z.string().min(2),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

// Only these fields can be changed through PATCH /auth/me; any other key is rejected.
const updateProfileSchema = z
  .strictObject({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.email().trim().optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined, {
    message: "At least one field must be provided",
  });

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = registerSchema.parse(req.body);

      const user = await this.authService.register(
        validatedData.email,
        validatedData.name,
        validatedData.password,
      );

      res.status(201).json({
        message: "Compte créé avec succès",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Données invalides", details: error.message });
        return;
      }

      const message = error instanceof Error ? error.message : "Erreur interne";

      if (message.includes("Conflit de données")) {
        res.status(409).json({ error: "Cet email est déjà utilisé." });
        return;
      }

      res.status(500).json({ error: "Erreur serveur" });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = loginSchema.parse(req.body);

      const { accessToken, refreshToken, user } = await this.authService.login(
        validatedData.email,
        validatedData.password,
      );
      this.setCookies(res, accessToken, refreshToken);

      res.status(200).json({
        message: "Connexion réussie",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Données invalides", details: error.message });
        return;
      }

      const message = error instanceof Error ? error.message : "Erreur interne";

      if (message === "Identifiants invalides") {
        res.status(401).json({ error: message });
        return;
      }

      console.error("[Login Error]", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        res.status(401).json({ error: "Session inexistante" });
        return;
      }

      const session = await this.authService.refreshSession(refreshToken);
      this.setCookies(res, session.accessToken, session.refreshToken);

      res
        .status(200)
        .json({ message: "Session rafraîchie", user: session.user });
    } catch {
      res
        .status(401)
        .json({ error: "Session expirée, veuillez vous reconnecter" });
    }
  };

  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.authService.getUserById(req.userId!);

      if (!user) {
        res.status(404).json({ error: "Utilisateur introuvable" });
        return;
      }

      res.status(200).json({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("[Profile Error]", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const changes = updateProfileSchema.parse(req.body);

      const user = await this.authService.updateProfile(req.userId!, changes);

      res.status(200).json({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const { formErrors, fieldErrors } = z.flattenError(error);

        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: formErrors[0] ?? "Invalid request",
            details: fieldErrors,
          },
        });
        return;
      }

      const message = error instanceof Error ? error.message : "";

      if (message === "Utilisateur introuvable") {
        res.status(404).json({
          error: { code: "USER_NOT_FOUND", message: "User not found" },
        });
        return;
      }

      if (message.includes("Conflit de données")) {
        res.status(409).json({
          error: {
            code: "EMAIL_ALREADY_IN_USE",
            message: "This email is already used by another account.",
            details: { email: ["This email is already in use"] },
          },
        });
        return;
      }

      console.error("[Update Profile Error]", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
      });
    }
  };

  getActivityStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.authService.getActivityStats(req.userId!);

      res.status(200).json(stats);
    } catch (error) {
      console.error("[Profile Stats Error]", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
      });
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.authService.logout(req.userId!);
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({ message: "Déconnexion réussie" });
  };

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    });
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
  }
}
