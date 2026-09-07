# Project Standards

This directory contains the engineering standards used by the Kanban rework project.

## Entry Point

- [Development Conventions](DEVELOPMENT_CONVENTIONS.md)

## Detailed Standards

- [Naming Conventions](NAMING_CONVENTIONS.md)
- [Git Conventions](GIT_CONVENTIONS.md)
- [Code Quality Standards](CODE_QUALITY.md)
- [Testing Conventions](TESTING_CONVENTIONS.md)
- [API and Backend Conventions](API_CONVENTIONS.md)

## Architecture and Migration

- [Frontend Migration](../architecture/FRONTEND_MIGRATION.md)
- [Backend Migration](../architecture/BACKEND_MIGRATION.md)

French versions use the `.fr.md` suffix.

The project follows an incremental modernization strategy: preserve the existing application, establish safety nets, migrate progressively to TypeScript and the target modular architecture, then add the Kanban domain and required infrastructure.


## Current Target Persistence

The audited legacy application uses SQLite / MySQL persistence. The target architecture deliberately migrates the rebuilt persistence layer to **Prisma + PostgreSQL**. Historical legacy tickets are not automatically imported because their ownership cannot be determined reliably.
