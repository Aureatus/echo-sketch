import type { DiagramResponse } from "@/lib/queries";
import { get, set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";

export type HistoryItem = DiagramResponse & { timestamp: number };
const STORAGE_KEY = "diagramHistory";

export function usePersistedHistory() {
	const [history, setHistory] = useState<HistoryItem[]>([]);

	// Load persisted history on mount
	useEffect(() => {
		get<HistoryItem[]>(STORAGE_KEY).then((data) => {
			if (data) setHistory(data);
		});
	}, []);

	// Add a new item and persist
	const addHistory = useCallback((item: HistoryItem) => {
		setHistory((prev) => {
			const next = [...prev, item];
			set(STORAGE_KEY, next);
			return next;
		});
	}, []);

	return { history, addHistory };
}
