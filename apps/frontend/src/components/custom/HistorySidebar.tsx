import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DiagramResponse } from "@/lib/queries";
import { cn } from "@/lib/utils";

export interface HistoryItem extends DiagramResponse {
	timestamp: number;
}

export interface HistorySidebarProps {
	history: HistoryItem[];
	isOpen?: boolean;
	onItemClick: (item: HistoryItem) => void | Promise<void>;
	selectedTimestamp?: number;
}

export function HistorySidebar({
	history,
	isOpen = true,
	onItemClick,
	selectedTimestamp,
}: HistorySidebarProps) {
	if (!isOpen) return null;

	const formatTimestamp = (ts: number) => {
		const date = new Date(ts);
		return date.toLocaleString(undefined, {
			dateStyle: "short",
			timeStyle: "short",
		});
	};

	return (
		<Card className="flex flex-col flex-1 border-0 md:border">
			<CardHeader className="px-4 py-3">
				<CardTitle className="text-lg">History</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 p-0">
				<ScrollArea className="h-full p-2 w-full">
					{history.length === 0 ? (
						<div className="text-center text-muted-foreground p-4">
							No history yet.
						</div>
					) : (
						<ul className="space-y-1">
							{[...history].reverse().map((item) => (
								<li key={item.timestamp}>
									<Button
										variant="ghost"
										size="sm"
										className={cn(
											"w-full h-auto justify-start p-2 text-left whitespace-normal break-words flex flex-col items-start",
											selectedTimestamp === item.timestamp &&
												"bg-accent text-accent-foreground font-semibold",
										)}
										onClick={() => onItemClick(item)}
									>
										<span className="text-sm font-medium leading-none truncate max-w-full block">
											{item.instruction || "Voice Input"}
										</span>
										<span className="text-xs text-muted-foreground mt-1">
											{formatTimestamp(item.timestamp)}
										</span>
									</Button>
								</li>
							))}
						</ul>
					)}
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
