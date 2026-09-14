
---

## Backend Developer Guide

This guide covers the standard workflows for setting up a fresh development environment and updating your local database when switching to a new issue or branch where your local database is behind.

### Prerequisites

* Node.js (v24 LTS )
* Docker and Docker Compose

---

### 1. Fresh Setup (New Developer)

Follow these steps when cloning the repository and setting up your local machine for the first time:

1. **Install dependencies:**
```bash
cd kanban-app/backend
npm install
```


2. **Configure the environment variables:**
   Copy the example environment file and adjust values if needed (they point to the local Docker container by default):
```bash
cp .env.example .env
```


3. **Start the local PostgreSQL database:**
   Navigate into the backend directory and launch the local development database container in the background:
```bash
cd backend
docker compose up -d
```


4. **Run migrations and generate the Prisma client:**
   Apply existing database migrations to create your local database structure, and generate the TypeScript Prisma client:
```bash
npx prisma migrate dev
npx prisma generate
```


5. **Start the development server:**
   Launch the app with hot-reloading enabled:
```bash
npm run dev
```



---

### 2. Updating Local Database When Switching Issues / Branches

When you switch to a new branch or issue where your local database is out of sync or behind the latest migrations:

1. **Pull the latest changes or switch branches:**
```bash
git checkout <branch-name>
git pull
```


*(This ensures you have the latest migration files and `schema.prisma` updates).*
2. **Ensure your local database container is running:**
```bash
docker compose up -d
```


3. **Sync your local database and regenerate the client:**
   Run the migration command to apply any pending database changes, and make sure your TypeScript client is up to date:
```bash
npx prisma migrate dev
npx prisma generate
```


*Note: This will bring your local database fully up to date and ensure your code recognizes any new models or fields introduced in the new issue.*