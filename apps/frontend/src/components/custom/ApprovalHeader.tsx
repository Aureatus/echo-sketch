import { Check, RefreshCw, X } from "lucide-react";
import { Button } from "../ui/button";

export function ApprovalHeader({
	approve,
	retry,
	decline,
}: { approve: () => void; retry: () => void; decline: () => void }) {
	return (
		<div className="flex space-x-2">
			<Button
				variant="ghost"
				size="icon"
				onClick={approve}
				className="text-green-500"
			>
				<Check className="w-8 h-8" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				onClick={() => {
					console.log("retry button clicked");
					retry();
				}}
				className="text-yellow-500"
			>
				<RefreshCw className="w-8 h-8" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				onClick={decline}
				className="text-red-500"
			>
				<X className="w-8 h-8" />
			</Button>
		</div>
	);
}
