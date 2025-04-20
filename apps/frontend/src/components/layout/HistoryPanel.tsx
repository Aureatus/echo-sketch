import { HistorySidebar } from "@/components/custom/HistorySidebar";
import type { HistoryItem } from "@/components/custom/HistorySidebar";
import { SidebarModal } from "@/components/layout/SidebarModal";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export interface HistoryPanelProps {
	history: HistoryItem[];
	selectedTimestamp?: number;
	onSelect: (item: HistoryItem) => void;
}

export function HistoryPanel({
	history,
	selectedTimestamp,
	onSelect,
}: HistoryPanelProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<>
			<SidebarModal open={isModalOpen} onOpenChange={setIsModalOpen}>
				<HistorySidebar
					history={history}
					isOpen={true}
					selectedTimestamp={selectedTimestamp}
					onItemClick={(item) => {
						onSelect(item);
						setIsModalOpen(false);
					}}
				/>
			</SidebarModal>

			<aside
				className={`${isSidebarOpen ? "w-64" : "w-16"} hidden md:flex flex-col h-full p-2 bg-card text-card-foreground border-r border-border`}
			>
				<div className="flex justify-end mb-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsSidebarOpen((prev) => !prev)}
					>
						{isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
					</Button>
				</div>
				{isSidebarOpen && (
					<HistorySidebar
						history={history}
						isOpen={isSidebarOpen}
						selectedTimestamp={selectedTimestamp}
						onItemClick={onSelect}
					/>
				)}
			</aside>
		</>
	);
}
