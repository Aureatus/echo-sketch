import type { DiagramResponse } from "@/lib/queries";
import { useCallback } from "react";
import { useIndexedDBState } from "@/hooks/useStorageState";

export type HistoryItem = DiagramResponse & { timestamp: number };
const STORAGE_KEY = "diagramHistory";

export function usePersistedHistory(storageKey: string = STORAGE_KEY) {
  const [history, setHistory] = useIndexedDBState<HistoryItem[]>(
    storageKey,
    [],
  );

  const addHistory = useCallback(
    (item: HistoryItem) => {
      setHistory((prev) => [...prev, item]);
    },
    [setHistory],
  );

  return { history, addHistory };
}
