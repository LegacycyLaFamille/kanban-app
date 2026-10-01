import { Router } from "express";
import { prisma } from "../../shared/database/prisma.js";
import { requireAuth } from "../../shared/security/requireAuth.js";
import { DataExportController } from "./DataExportController.js";
import { DataExportService } from "./DataExportService.js";
import { PrismaDataExportRepository } from "./PrismaDataExportRepository.js";

export const exportRouter = Router();

const dataExportController = new DataExportController(
  new DataExportService(new PrismaDataExportRepository(prisma)),
);

exportRouter.get(
  "/auth/me/export",
  requireAuth,
  dataExportController.exportUserData,
);

exportRouter.get(
  "/auth/me/personal-data",
  requireAuth,
  dataExportController.exportPersonalData,
);
