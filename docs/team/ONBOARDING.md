# Team Onboarding Guide

Welcome to the Kanban App project.

This guide contains the essential information a new team member needs to understand how the team communicates, collaborates, and organizes its work.

## 1. Project overview

The project progressively modernizes a legacy TodoList application into a maintainable Kanban application.

The migration is incremental: the legacy application must remain operational while old components are isolated, replaced, validated, and eventually removed.

### Main technologies

- React
- TypeScript
- Vite
- Reshaped
- Node.js
- Express
- Prisma
- PostgreSQL
- RabbitMQ
- Docker
- GitHub Actions

### Architecture

Frontend:
- React + TypeScript
- Feature-based architecture

Backend:
- Node.js + Express + TypeScript
- Modular monolith
- Controller -> Service -> Repository -> Prisma -> PostgreSQL

Migration approach:
1. Understand the existing application.
2. Isolate legacy code.
3. Protect existing behaviour.
4. Introduce the target architecture.
5. Replace legacy components progressively.
6. Remove obsolete legacy code only after validation.

## 2. Important links

- [GitHub Repository](https://github.com/LegacycyLaFamille/kanban-app)
- [GitHub Project](https://github.com/orgs/LegacycyLaFamille/projects/1/)
- [Discord](https://discord.gg/cUBWcBGasE)

The GitHub Project is the source of truth for backlog items, Sprint planning, ownership, priorities, estimates, dependencies, and task status.

Discord is the main communication platform used by the team.

Important project decisions must not remain only in private messages. If a discussion leads to an important technical or organizational decision, document the result in GitHub or under `docs/`.

## 3. Communication

### Discord

Use Discord for:
- Quick questions
- Coordination
- Blocking issues
- Short technical discussions
- Pull Request review requests

Typical channels:
- `#announcements`: important project announcements
- `#general`: general discussions
- `#dev`: technical discussions
- `#pull-requests`: Pull Requests requiring review
- `#github-notifications`: GitHub notifications (commits, Pull Requests, ...)
- `#resources`: all useful project resources

Channel names may differ depending on the current Discord configuration.

### GitHub Issues

Use GitHub Issues for:
- Features
- Bugs
- Technical tasks
- Acceptance criteria
- Dependencies
- Work assignment

### Pull Requests

Use Pull Requests for:
- Code review
- Implementation discussions
- Technical feedback
- Validation before merge

### Documentation

Long-term technical information belongs under `docs/`.

Main areas:
- `docs/audit/`
- `docs/architecture/`
- `docs/standards/`
- `docs/team/`

## 4. Communication expectations

Team members are not expected to monitor Discord continuously.

During working periods:
- Check Discord regularly.
- Check assigned GitHub Issues.
- Report blockers as soon as possible.
- Prefer public project channels over private messages.
- Mention another developer only when their input is required.
- Keep related technical discussions together.

When asking for help, provide:
- What you are trying to do
- What you expected
- What happened instead
- Relevant logs or errors
- What you already tried

## 5. Team rhythm

The project follows Scrum with short development cycles.

### Daily Scrum

Frequency: **every working day**

Each developer briefly explains:
1. What was completed since the previous Daily.
2. What will be worked on next.
3. Whether anything is blocking progress.

The Daily is for coordination. Long technical discussions should continue afterwards with the relevant developers.

### Sprint Planning

Frequency: **at the beginning of each Sprint**

Objectives:
- Review the Sprint objective
- Select backlog items
- Confirm priorities
- Check estimates
- Confirm ownership
- Identify dependencies

### Sprint Review

Frequency: **at the end of each Sprint**

Objectives:
- Demonstrate completed functionality
- Review Sprint deliverables
- Collect feedback
- Confirm what has actually been completed

Only working and demonstrable functionality should be presented as completed.

### Sprint Retrospective

Frequency: **at the end of each Sprint**

Discuss:
- What worked well
- What caused problems
- What should be improved
- What should be kept for the next Sprint

## 6. GitHub Project workflow

Standard workflow:

`Backlog -> Ready -> In Progress -> In Review -> Testing -> Done`

Use `Blocked` when progress depends on another task or unresolved issue.

Before starting an issue:
1. Assign yourself to the issue.
2. Move it to `In Progress`.
3. Read the description and acceptance criteria.
4. Check dependencies.
5. Create a dedicated branch.

## 7. Branch naming

Format:

`<type>/<issue-id>-<short-description>`

Examples:
- `feature/S1-08-routing`
- `feature/S1-20-project-crud`
- `fix/S2-14-project-authorization`
- `ci/S1-31-github-actions`

Do not develop directly on `main`.

## 8. Commit convention

The project uses Conventional Commits.

Format:

`<type>(optional-scope): <description>`

Examples:
- `feat(projects): add project details page`
- `fix(auth): prevent expired session reuse`
- `refactor(tasks): extract task repository`
- `test(projects): add project service tests`
- `docs(team): add onboarding guide`
- `ci: add frontend quality check`

Common types:
- `feat`
- `fix`
- `refactor`
- `test`
- `docs`
- `style`
- `perf`
- `ci`
- `build`
- `chore`
- `revert`

## 9. Pull Requests

Before opening a Pull Request:
- Verify the application still runs.
- Run relevant tests.
- Run linting when applicable.
- Run type checking when applicable.
- Check the issue acceptance criteria.
- Keep the PR focused on one issue.

A Pull Request should contain:
- A clear description
- Main changes
- Validation performed
- Relevant technical notes
- The linked GitHub Issue

Use `Closes #<issue-number>` when applicable.

Prefer small and focused Pull Requests.

## 10. Code review

When reviewing a Pull Request, check:
- Correctness
- Readability
- Architecture consistency
- Security implications
- Error handling
- Tests
- Acceptance criteria
- Possible regressions
- Unnecessary complexity

Project conventions take precedence over personal coding preferences.

## 11. Legacy code

Legacy code must not be rewritten simply because it is old.

Current legacy boundaries:
- `frontend/src/app/legacy/`
- `backend/src/legacy/`

Before removing legacy code:
1. Its replacement must exist.
2. Its replacement must work.
3. Relevant behaviour must be validated.
4. No active dependency should still reference the old code.

## 12. Documentation structure

- `docs/audit/`: legacy analysis and technical debt
- `docs/architecture/`: target architecture and migration strategies
- `docs/standards/`: development, naming, Git, testing, API, and quality conventions
- `docs/team/`: team organization and onboarding

## 13. Definition of Done

A task is not complete only because its code has been written.

Depending on the issue, completion includes:
- Acceptance criteria satisfied
- Code reviewed
- Required tests passing
- CI passing
- No blocking quality issue introduced
- Documentation updated when necessary
- Pull Request approved
- Changes merged
- Functionality demonstrable when applicable

## 14. First-day checklist

- [ ] Join the Discord server
- [ ] Access the GitHub repository
- [ ] Access the GitHub Project
- [ ] Clone the repository
- [ ] Read the main README
- [ ] Read this onboarding guide
- [ ] Read the development conventions
- [ ] Read the Git conventions
- [ ] Read the architecture documentation
- [ ] Install project dependencies
- [ ] Start the frontend locally
- [ ] Start the backend locally
- [ ] Verify the legacy application works
- [ ] Identify your assigned issue
- [ ] Check its dependencies
- [ ] Read its acceptance criteria
- [ ] Create your development branch

If something required to start working is missing, notify the team as soon as possible.
