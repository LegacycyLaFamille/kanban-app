-- CreateTable
CREATE TABLE "LegacyTodoItem" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "migratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyTodoItem_pkey" PRIMARY KEY ("id")
);

