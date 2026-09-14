# Team Onboarding Guide

Welcome to the Kanban App project.

This document contains the essential information required to quickly understand how the team communicates, collaborates and organizes its work.

---

## 1. Project Overview

The project consists of progressively modernizing an existing legacy TodoList application into a maintainable Kanban application.

The modernization is incremental: the existing application must remain operational while legacy components are progressively isolated and replaced.

Main technologies:

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

The project follows a modular monolith architecture and a feature-based frontend architecture.

---

## 2. Important Links

### GitHub Repository

[Github](https://github.com/LegacycyLaFamille/kanban-app)

### GitHub Project

[Github Project](https://github.com/orgs/LegacycyLaFamille/projects/1/)

The GitHub Project is the source of truth for:

- Backlog
- Sprint planning
- Task assignment
- Current task status
- Priorities
- Estimates
- Dependencies

### Discord

[Discord](https://discord.gg/cUBWcBGasE)

Discord is the main communication platform used by the team.

Important project decisions must not exist only in private messages.

If a discussion leads to an architectural or organizational decision, the result should be documented in GitHub or in the project documentation.

---

## 3. Discord Usage

Discord is used for quick team communication.

Recommended channel organization:

| Channel | Usage |
| --- | --- |
| `#announcements` | Important team and project announcements |
| `#general` | General project discussion |
| `#development` | Technical discussions and implementation questions |
| `#pull-requests` | Pull requests requiring review |
| `#ci-cd` | CI/CD and GitHub Actions notifications |
| `#help` | Blocking issues or requests for help |

Channel names may differ depending on the current Discord configuration.

Avoid spreading the same technical discussion across several channels.

When possible, keep replies related to the same subject in the same discussion/thread.

---

## 4. Communication Rules

Use Discord for:

- Quick questions
- Coordination
- Blocking issues
- Short technical discussions
- PR review requests

Use GitHub Issues for:

- Work to be implemented
- Bugs
- Features
- Acceptance criteria
- Technical tasks
- Task dependencies

Use Pull Requests for:

- Code review
- Implementation discussions
- Technical feedback directly related to a change

Use `/docs` for:

- Architecture decisions
- Development conventions
- Migration strategies
- Technical documentation
- Long-term information

Important decisions should always leave a written trace.

---

## 5. Communication Expectations

You are not expected to monitor Discord continuously.

During working periods:

- Check Discord regularly.
- Check your assigned GitHub issues.
- React quickly when another developer is blocked by your work.
- Mention people only when their input is required.
- Prefer public project channels over private messages for project-related information.

If you become blocked, communicate it as soon as possible rather than waiting until the next meeting.

When asking for help, include:

- What you are trying to do
- What you expected
- What happened instead
- Relevant logs or errors
- What you already tried

---

## 6. Team Rhythm

The project follows Scrum with short development cycles.

### Daily Scrum

Frequency:

**Every working day**

Keep it short.

Each developer should communicate:

1. What was completed since the previous Daily.
2. What will be worked on next.
3. Whether something is blocking progress.

The Daily is for coordination, not for solving long technical discussions.

Technical discussions should continue afterwards with the relevant developers.

---

### Sprint Planning

Frequency:

**At the beginning of each Sprint**

Objectives:

- Review the Sprint objective
- Select backlog items
- Verify priorities
- Check estimates
- Assign or confirm owners
- Identify dependencies

---

### Sprint Review

Frequency:

**At the end of each Sprint**

Objectives:

- Demonstrate completed functionality
- Verify Sprint deliverables
- Review what was actually completed
- Collect feedback

Only working and demonstrable functionality should be presented as completed.

---

### Sprint Retrospective

Frequency:

**At the end of each Sprint**

Discuss:

- What worked well
- What created problems
- What should change
- What the team should keep doing

The objective is to improve the team's way of working for the next Sprint.

---

## 7. GitHub Project Workflow

Typical task lifecycle:

```text
Backlog
   ↓
Ready
   ↓
In Progress
   ↓
In Review
   ↓
Testing
   ↓
Done