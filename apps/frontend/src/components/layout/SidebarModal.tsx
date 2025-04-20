import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { History } from "lucide-react";
import type React from "react";

export interface SidebarModalProps {
	children: React.ReactNode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SidebarModal({
	children,
	open,
	onOpenChange,
}: SidebarModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline" size="icon" className="md:hidden m-2">
					<History className="h-5 w-5" />
				</Button>
			</DialogTrigger>
			<DialogContent className="p-0 w-3/4 max-w-xs">
				<DialogTitle className="sr-only">History</DialogTitle>
				<DialogDescription className="sr-only">
					Select an item from history
				</DialogDescription>
				{children}
			</DialogContent>
		</Dialog>
	);
}
