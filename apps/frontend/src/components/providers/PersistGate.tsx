import { useIsRestoring } from "@tanstack/react-query";
import type { ReactNode } from "react";

export function PersistGate({ children }: { children: ReactNode }) {
	const isRestoring = useIsRestoring();

	if (isRestoring) {
		return null;
	}

	return children;
}
