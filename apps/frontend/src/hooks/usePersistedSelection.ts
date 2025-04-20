import { useEffect } from "react";
import { useSessionStorageState } from "@/hooks/useStorageState";

export interface HistoryItem {
  timestamp: number;
  diagram: string;
}

export function usePersistedSelection(
  history: HistoryItem[],
  storageKey: string
): [number | undefined, (ts: number) => void] {
  const [stored, setStored] = useSessionStorageState<number | null>(
    storageKey,
    null
  );
  const selected = stored === null ? undefined : stored;

  useEffect(() => {
    if (history.length === 0) return;
    const ts =
      selected !== undefined
        ? selected
        : history[history.length - 1].timestamp;
    const item = history.find((i) => i.timestamp === ts) || history[history.length - 1];
    if (item.timestamp !== selected) {
      setStored(item.timestamp);
    }
  }, [history, selected, setStored]);

  return [selected, setStored];
}
