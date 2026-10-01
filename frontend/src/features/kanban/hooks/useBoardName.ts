import { useEffect, useState } from "react";

import { getBoard } from "../../projects/api/boards.api";

// Name of the board opened from the URL. Stays undefined while loading or if
// the board cannot be read, so the page falls back to a generic title.
export function useBoardName(boardId?: string): string | undefined {
  const [board, setBoard] = useState<{ id: string; name: string }>();

  useEffect(() => {
    if (!boardId) return;
    let isSubscribed = true;

    getBoard(boardId)
      .then(({ id, name }) => {
        if (isSubscribed) setBoard({ id, name });
      })
      .catch(() => {
        // The task list reports access/network errors; the title just falls back.
      });

    return () => {
      isSubscribed = false;
    };
  }, [boardId]);

  return board && board.id === boardId ? board.name : undefined;
}
