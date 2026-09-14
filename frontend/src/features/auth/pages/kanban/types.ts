export type ColumnId = "todo" | "in-progress" | "done";

export type Task = {
  id: string;
  title: string;
  columnId: ColumnId;
};

export const DND_ITEM_TYPE = "TASK_CARD";

export type DragItem = {
  id: string;
  sourceColumnId: ColumnId;
};
