/**
 * Callback ref that names the <table> rendered inside the referenced element
 * after the element whose id is `labelId` (RGAA 5.4: a data table's title
 * must be associated with the table).
 *
 * reshaped's <Table> only forwards attributes to its wrapping <div>, and a
 * <caption> child breaks its <thead>/<tbody> detection, so the association
 * is set on the rendered <table> directly.
 */
export function labelTable(labelId: string) {
  return (element: HTMLElement | null) => {
    element?.querySelector("table")?.setAttribute("aria-labelledby", labelId);
  };
}
