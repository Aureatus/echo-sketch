import { get, set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook for syncing state with sessionStorage.
 */
export function useSessionStorageState<T>(
	key: string,
	defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
	const [state, setState] = useState<T>(() => {
		const stored = sessionStorage.getItem(key);
		return stored !== null ? JSON.parse(stored) : defaultValue;
	});

	const updateState = useCallback(
		(value: T | ((prev: T) => T)) => {
			setState((prev) => {
				const actualValue =
					typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
				sessionStorage.setItem(key, JSON.stringify(actualValue));
				return actualValue;
			});
		},
		[key],
	);

	return [state, updateState];
}

/**
 * Hook for syncing state with IndexedDB via idb-keyval.
 */
export function useIndexedDBState<T>(
	key: string,
	defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
	const [state, setState] = useState<T>(defaultValue);

	useEffect(() => {
		get<T>(key).then((stored) => {
			if (stored !== undefined) setState(stored);
		});
	}, [key]);

	const updateState = useCallback(
		(value: T | ((prev: T) => T)) => {
			setState((prev) => {
				const newVal =
					typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
				set(key, newVal);
				return newVal;
			});
		},
		[key],
	);

	return [state, updateState];
}
