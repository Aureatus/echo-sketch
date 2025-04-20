import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DiagramResponse } from "@/lib/queries";

export interface HistoryItem extends DiagramResponse {
	timestamp: number;
}

export interface HistorySidebarProps {
	history: HistoryItem[];
	isOpen?: boolean;
	onItemClick: (item: HistoryItem) => void | Promise<void>;
}

export function HistorySidebar({
	history,
	isOpen = true,
	onItemClick,
}: HistorySidebarProps) {
	if (!isOpen) return null;
	return (
		<Card className="flex flex-col flex-1">
			<CardHeader>
				<CardTitle>History</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 p-0">
				<ScrollArea className="h-full p-2 w-full">
					<ul className="space-y-2">
						{history.map((item) => (
							<li key={item.timestamp}>
								<Button
									variant="link"
									size="default"
									className="w-full justify-start p-0 whitespace-normal break-words"
									onClick={() => onItemClick(item)}
								>
									{item.instruction}
								</Button>
							</li>
						))}
					</ul>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
