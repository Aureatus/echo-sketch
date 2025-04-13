import { createContext, useContext } from "react";

// Types needed by the context and hook
export type Theme = "dark" | "light" | "system";

export type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	resolvedTheme: "light" | "dark";
};

// Initial state for the context
const initialState: ThemeProviderState = {
	theme: "system",
	setTheme: () => null,
	resolvedTheme: "light",
};

// Context definition (needs to be exported for ThemeProvider)
export const ThemeProviderContext =
	createContext<ThemeProviderState>(initialState);

// The hook itself
export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (context === undefined)
		throw new Error("useTheme must be used within a ThemeProvider");

	return context;
};
