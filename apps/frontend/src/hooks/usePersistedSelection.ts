import { useEffect, useState } from "react";

export interface HistoryItem {
	timestamp: number;
	diagram: string;
}

export function usePersistedSelection(
	history: HistoryItem[],
	storageKey: string,
): [number | undefined, (ts: number) => void] {
	const [selected, setSelected] = useState<number | undefined>(() => {
		const stored = sessionStorage.getItem(storageKey);
		return stored ? Number(stored) : undefined;
	});

	// When history changes or selected changes, ensure a valid selection and persist
	useEffect(() => {
		if (history.length === 0) return;
		const ts =
			selected !== undefined ? selected : history[history.length - 1].timestamp;
		const item =
			history.find((i) => i.timestamp === ts) || history[history.length - 1];
		if (item.timestamp !== selected) {
			setSelected(item.timestamp);
		}
		sessionStorage.setItem(storageKey, String(item.timestamp));
	}, [history, selected, storageKey]);

	return [selected, setSelected];
}
