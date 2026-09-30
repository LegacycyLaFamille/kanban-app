export type LegacySourceKind = "mysql" | "sqlite";

// Raw row as returned by the legacy `todo_items` table. The legacy schema has
// no primary key and no NOT NULL constraint, so every column is untrusted.
export interface LegacyTodoRow {
  id: unknown;
  name: unknown;
  completed: unknown;
}

export interface LegacyTodoItem {
  id: string;
  name: string | null;
  completed: boolean;
  source: LegacySourceKind;
}

export interface LegacyTodoSource {
  readonly kind: LegacySourceKind;
  // Human readable location, never includes credentials.
  readonly location: string;
  readAll(): Promise<LegacyTodoRow[]>;
  close(): Promise<void>;
}

export interface LegacyTodoArchive {
  upsertMany(items: LegacyTodoItem[]): Promise<void>;
  countExisting(ids: string[]): Promise<number>;
}
