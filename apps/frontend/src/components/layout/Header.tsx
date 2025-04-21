import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { Route as ExcalidrawRoute } from "@/routes/excalidraw";
import { Route as MermaidRoute } from "@/routes/mermaid";

export default function Header() {
	// removed dynamic preload code

	const { theme, resolvedTheme, setTheme } = useTheme();

	const toggleTheme = () => {
		setTheme(theme === "light" || theme === "system" ? "dark" : "light");
	};

	return (
		<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-14 px-4 flex items-center justify-between">
			<nav className="flex flex-row items-center gap-4">
				<div className="flex items-center mr-4">
					<Link to="/">
						<img
							src={
								resolvedTheme === "dark"
									? "/header-dark.png"
									: "/header-light.png"
							}
							srcSet={
								resolvedTheme === "dark"
									? "/header-dark.png 1x, /header-dark@2x.png 2x"
									: "/header-light.png 1x, /header-light@2x.png 2x"
							}
							alt="Echo Sketch Logo"
							className="h-8"
						/>
					</Link>
				</div>
				<div>
					<Link
						to={ExcalidrawRoute.id}
						className="text-muted-foreground"
						activeProps={{
							className:
								"font-bold text-primary border-b-2 border-primary pb-1",
						}}
					>
						Draw
					</Link>
				</div>

				<div>
					<Link
						to={MermaidRoute.id}
						className="text-muted-foreground"
						activeProps={{
							className:
								"font-bold text-primary border-b-2 border-primary pb-1",
						}}
					>
						Mermaid
					</Link>
				</div>
			</nav>
			<div className="flex items-center">
				<Button variant="outline" size="icon" onClick={toggleTheme}>
					{resolvedTheme === "dark" ? (
						<Sun className="h-6 w-6" />
					) : (
						<Moon className="h-6 w-6" />
					)}
					<span className="sr-only">Toggle theme</span>
				</Button>
			</div>
		</header>
	);
}
