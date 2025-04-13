import {
	type Theme,
	ThemeProviderContext,
	type ThemeProviderState,
} from "@/hooks/useTheme";
import { useEffect, useState, useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
	mediaQuery.addEventListener("change", onChange);
	return () => mediaQuery.removeEventListener("change", onChange);
};

const getSnapshot = (): "light" | "dark" => {
	if (typeof window === "undefined") {
		return "light";
	}
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
};

const getServerSnapshot = (): "light" | "dark" => {
	return "light";
};

type ThemeProviderProps = {
	children: React.ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
};

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = "vite-ui-theme",
	...props
}: ThemeProviderProps) {
	const [theme, setTheme] = useState<Theme>(
		() => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
	);

	const systemTheme = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getServerSnapshot,
	);

	const actualTheme = theme === "system" ? systemTheme : theme;

	useEffect(() => {
		const root = window.document.documentElement;
		root.classList.remove("light", "dark");
		root.classList.add(actualTheme);
	}, [actualTheme]);

	const value: ThemeProviderState = {
		theme,
		resolvedTheme: actualTheme,
		setTheme: (theme: Theme) => {
			localStorage.setItem(storageKey, theme);
			setTheme(theme);
		},
	};

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}
