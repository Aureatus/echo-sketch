import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export default function Header() {
	// removed dynamic preload code

	const { theme, setTheme } = useTheme();

	const toggleTheme = () => {
		setTheme(theme === "light" || theme === "system" ? "dark" : "light");
	};

	return (
		<header className="relative sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-14">
			<div className="container flex h-full max-w-screen-2xl items-center">
				<nav className="flex flex-row items-center gap-4">
					<div className="font-bold">
						<Link to="/draw" className="[&.active]:font-bold">
							Draw
						</Link>
					</div>

					<div className="font-bold">
						<Link to="/mermaid" className="[&.active]:font-bold">
							Mermaid
						</Link>
					</div>
				</nav>
			</div>

			<div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
				<Button variant="outline" size="icon" onClick={toggleTheme}>
					<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
					<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
					<span className="sr-only">Toggle theme</span>
				</Button>
			</div>
		</header>
	);
}
