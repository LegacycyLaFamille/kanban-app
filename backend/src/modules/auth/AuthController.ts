import type { Request, Response } from "express";
import { AuthService } from "./AuthService.js";
import type {
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "./auth.schema.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, name, password } = req.body as RegisterInput;

      const user = await this.authService.register(email, name, password);

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
      const message = error instanceof Error ? error.message : "";

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

      console.error("[Register Error]", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as LoginInput;

      const { accessToken, refreshToken, user } = await this.authService.login(
        email,
        password,
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
      const message = error instanceof Error ? error.message : "";

      if (message === "Identifiants invalides") {
        res.status(401).json({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials.",
          },
        });
        return;
      }

      console.error("[Login Error]", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
      });
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        res.status(401).json({
          error: { code: "NO_SESSION", message: "No active session." },
        });
        return;
      }

      const session = await this.authService.refreshSession(refreshToken);
      this.setCookies(res, session.accessToken, session.refreshToken);

      res
        .status(200)
        .json({ message: "Session rafraîchie", user: session.user });
    } catch {
      res.status(401).json({
        error: {
          code: "SESSION_EXPIRED",
          message: "Session expired, please sign in again.",
        },
      });
    }
  };

  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.authService.getUserById(req.userId!);

      if (!user) {
        res.status(404).json({
          error: { code: "USER_NOT_FOUND", message: "User not found" },
        });
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
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Unexpected server error" },
      });
    }
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const changes = req.body as UpdateProfileInput;

      const user = await this.authService.updateProfile(req.userId!, changes);

      res.status(200).json({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      });
    } catch (error: unknown) {
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
