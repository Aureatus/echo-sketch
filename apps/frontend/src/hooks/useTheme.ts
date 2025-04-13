import { createContext, useContext } from "react";

// Types needed by the context and hook
export type Theme = "dark" | "light" | "system";

export type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

// Initial state for the context
const initialState: ThemeProviderState = {
	theme: "system",
	setTheme: () => null,
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
