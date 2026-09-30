// Wiring with the Prisma repositories, kept out of notification.consumer.ts
// so that tests can import the consumer without a generated Prisma client
// (same split as the modules' *.routes.ts files).
import type { EventBus } from "../../shared/events/EventBus.js";
import { prisma } from "../../shared/database/prisma.js";
import { PrismaProjectRepository } from "../projects/PrismaProjectRepository.js";
import { PrismaProjectMemberRepository } from "../projects/PrismaProjectMemberRepository.js";
import { PrismaNotificationRepository } from "./PrismaNotificationRepository.js";
import { NotificationService } from "./NotificationService.js";
import { subscribeNotificationConsumer } from "./notification.consumer.js";

// Called once at startup, before the broker connection.
export function startNotificationConsumer(eventBus: EventBus): Promise<void> {
  const service = new NotificationService(
    new PrismaNotificationRepository(prisma),
    new PrismaProjectRepository(prisma),
    new PrismaProjectMemberRepository(prisma),
  );
  return subscribeNotificationConsumer(eventBus, service);
}
