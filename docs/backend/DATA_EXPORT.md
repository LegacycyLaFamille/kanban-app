# User Data Export

An authenticated user can download a copy of the data they own, as CSV or
JSON, from their profile page (**Your data → Export my data**), or directly
through the API.

## Endpoint

```text
GET /api/v1/auth/me/export
```

Requires a valid session (`accessToken` cookie). A user can only ever export
their own data: the user is taken from the session, never from the request.

| Query parameter | Values | Default | Meaning |
|---|---|---|---|
| `format` | `csv`, `json` | `csv` | File type |
| `layout` | `single`, `per-project` | `single` | One file, or a ZIP archive with one file per project |
| `projectIds` | comma-separated project ids (max 100) | all owned projects | Restricts the export to these owned projects |

Examples:

```text
GET /api/v1/auth/me/export
GET /api/v1/auth/me/export?format=json
GET /api/v1/auth/me/export?layout=per-project
GET /api/v1/auth/me/export?projectIds=<id1>,<id2>
```

### Responses

| Status | Body | When |
|---|---|---|
| `200` | `text/csv`, `application/json` or `application/zip` attachment | Export generated |
| `400` | `VALIDATION_ERROR` | Unknown parameter, invalid `format` or `layout`, invalid or empty `projectIds` |
| `400` | `NOTHING_TO_EXPORT` | The user owns no projects |
| `401` | error | Not authenticated |
| `404` | `PROJECT_NOT_FOUND` | A selected project does not exist **or is not owned by the user** (both cases are indistinguishable on purpose) |

Responses are sent with `Cache-Control: no-store` since they contain personal
data.

## Scope

Included, for each project **owned** by the user:

- the project (id, name, description, creation date);
- its tasks (id, title, description, status, priority, deadline, board name,
  creation and last update dates).

Excluded:

- people's names and email addresses, including the user's own (see
  [Redaction](#redaction));
- credentials and session data (password hash, refresh token);
- projects the user does not own;
- legacy data, which is not migrated to the new model (ADR-007).

## Redaction

People are never identified in the export. Wherever a person relates to a
project, they are replaced by their **role in that project**:

| Role | Who |
|---|---|
| `owner` | The project owner |
| `member` | Anyone else with access to the project |

> Project membership (S2-19) is not implemented yet, so today every project
> only has its owner and `project_members` (CSV) / `members` (JSON) is always
> empty.

## CSV format

- Encoding: UTF-8 **with BOM**, so Excel displays accented characters
  correctly.
- Separator: comma (`,`). Line endings: CRLF (RFC 4180).
- Values containing a comma, a double quote or a line break are wrapped in
  double quotes; inner double quotes are doubled (`"` → `""`).
- Values starting with `=`, `+`, `-`, `@`, a tab or a carriage return are
  prefixed with `'` so spreadsheet software does not run them as formulas
  (CSV injection).
- Dates use ISO 8601 in UTC (`2026-09-28T12:00:00.000Z`). Empty values are
  empty cells.

### Columns

One row per task. A project without tasks still appears once, with empty task
columns.

| Column | Description |
|---|---|
| `project_id` | Project identifier (UUID) |
| `project_name` | Project name |
| `project_description` | Project description |
| `project_created_at` | Project creation date |
| `project_owner` | Always `owner` (see [Redaction](#redaction)) |
| `project_members` | Other people with access, as roles separated by `; ` (e.g. `member; member`) |
| `board_name` | Board the task belongs to, if any |
| `task_id` | Task identifier (UUID) |
| `task_title` | Task title |
| `task_description` | Task description |
| `task_status` | `TODO`, `IN_PROGRESS` or `DONE` |
| `task_priority` | Task priority (e.g. `LOW`, `NORMAL`, `HIGH`) |
| `task_deadline` | Task deadline, if any |
| `task_created_at` | Task creation date |
| `task_updated_at` | Task last update date |

## JSON format

UTF-8, indented with 2 spaces. Dates use ISO 8601 in UTC; empty values are
`null`.

```json
{
  "exportedAt": "2026-09-28T12:00:00.000Z",
  "projects": [
    {
      "id": "8e1f1945-743b-44e3-b05a-6950e0cdd08b",
      "name": "Kanban Platform",
      "description": "Main project",
      "createdAt": "2026-09-01T09:00:00.000Z",
      "updatedAt": "2026-09-02T09:00:00.000Z",
      "owner": "owner",
      "members": [],
      "tasks": [
        {
          "id": "fce1bba7-7873-4289-8c47-f11dee68dc63",
          "title": "Write specs",
          "description": "Draft the spec",
          "status": "DONE",
          "priority": "NORMAL",
          "deadline": null,
          "board": "Sprint 1",
          "createdAt": "2026-09-03T09:00:00.000Z",
          "updatedAt": "2026-09-04T09:00:00.000Z"
        }
      ]
    }
  ]
}
```

In a per-project ZIP, each file has the same structure with a single project.

## File names

- Single file: `kanban-export-<date>.csv` or `kanban-export-<date>.json`
- Per project: `kanban-export-<date>.zip`, containing one
  `<project-name-slug>-<first 8 characters of the project id>.<csv|json>` per
  project.

When downloaded from the profile page, `<date>` is the user's **local** date
and time (`YYYY-MM-DD_HH-mm`). When calling the API directly, the
`Content-Disposition` header suggests the UTC date (`YYYY-MM-DD`).
