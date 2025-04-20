import { Excalidraw } from "@excalidraw/excalidraw";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ApprovalHeader } from "./ApprovalHeader";

// Shared panel layout for diffs
function DiffPanel({
	title,
	children,
	headerExtra,
	contentClassName,
}: {
	title: string;
	children: React.ReactNode;
	headerExtra?: React.ReactNode;
	contentClassName?: string;
}) {
	return (
		<Card className="flex flex-col flex-1 m-1">
			<CardHeader
				className={
					headerExtra ? "flex justify-between items-center" : undefined
				}
			>
				<CardTitle>{title}</CardTitle>
				{headerExtra}
			</CardHeader>
			<CardContent className={`flex-1 ${contentClassName || ""}`}>
				{children}
			</CardContent>
		</Card>
	);
}

export function DrawDiffView({
	oldElements,
	resolvedTheme,
	newVersionKey,
	newElements,
	approve,
	retry,
	decline,
}: {
	oldElements: unknown[];
	resolvedTheme: "light" | "dark";
	newVersionKey: number;
	newElements: unknown[];
	approve: () => void;
	retry: () => void;
	decline: () => void;
}) {
	return (
		<div className="flex-1 flex flex-col h-full">
			<div className="flex-1 flex p-2">
				<DiffPanel title="Current">
					<Excalidraw
						initialData={{ elements: oldElements || [], appState: {} }}
						theme={resolvedTheme}
						viewModeEnabled
						zenModeEnabled
						UIOptions={{
							canvasActions: {
								changeViewBackgroundColor: false,
								loadScene: false,
								clearCanvas: false,
								export: false,
								saveAsImage: false,
								saveToActiveFile: false,
								toggleTheme: false,
							},
							tools: { image: false },
						}}
					/>
				</DiffPanel>
				<DiffPanel
					title="New"
					headerExtra={
						<ApprovalHeader approve={approve} retry={retry} decline={decline} />
					}
					key={newVersionKey}
				>
					<Excalidraw
						initialData={{
							elements: newElements,
							appState: {
								backgroundColor: "#dcfce7",
								viewBackgroundColor: "#dcfce7",
							},
						}}
						theme="light"
						viewModeEnabled
						zenModeEnabled
						UIOptions={{
							canvasActions: {
								changeViewBackgroundColor: false,
								loadScene: false,
								clearCanvas: false,
								export: false,
								saveAsImage: false,
								saveToActiveFile: false,
								toggleTheme: false,
							},
							tools: { image: false },
						}}
					/>
				</DiffPanel>
			</div>
		</div>
	);
}

export function MermaidDiffView({
	currentRef,
	newRef,
	approve,
	retry,
	decline,
}: {
	currentRef: React.RefObject<HTMLDivElement | null>;
	newRef: React.RefObject<HTMLDivElement | null>;
	approve: () => void;
	retry: () => void;
	decline: () => void;
}) {
	return (
		<div className="flex-1 flex p-2">
			<DiffPanel title="Current">
				<div ref={currentRef} />
			</DiffPanel>
			<DiffPanel
				title="New"
				headerExtra={
					<ApprovalHeader approve={approve} retry={retry} decline={decline} />
				}
				contentClassName="bg-green-50"
			>
				<div ref={newRef} />
			</DiffPanel>
		</div>
	);
}
