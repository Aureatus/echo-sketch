import { Excalidraw } from "@excalidraw/excalidraw";
import type React from "react";
import { cn } from "../../lib/utils";
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
		<Card className="flex flex-col flex-1 m-1 dark:border-gray-700 p-2 gap-1">
			<CardHeader
				className={cn(
					"px-0 py-0",
					headerExtra ? "flex justify-between items-center" : undefined,
				)}
			>
				<CardTitle>{title}</CardTitle>
				{headerExtra}
			</CardHeader>
			<CardContent
				className={cn(
					"flex-1 px-0 border border-border dark:border-gray-600 rounded-md p-1",
					contentClassName,
				)}
			>
				{children}
			</CardContent>
		</Card>
	);
}

// Common props for Excalidraw instances in the diff view
const commonExcalidrawProps: Partial<React.ComponentProps<typeof Excalidraw>> =
	{
		viewModeEnabled: true,
		zenModeEnabled: true,
		UIOptions: {
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
		},
	};

export function DrawDiffView({
	oldElements,
	resolvedTheme,
	newVersionKey,
	newElements,
	approve,
	retry,
	decline,
}: {
	oldElements: readonly unknown[];
	resolvedTheme: "light" | "dark";
	newVersionKey: number;
	newElements: readonly unknown[];
	approve: () => void;
	retry: () => void;
	decline: () => void;
}) {
	return (
		<div className="flex-1 flex flex-col h-full">
			<div className="flex-1 flex px-2 pb-2 pt-1">
				<DiffPanel title="Current">
					<Excalidraw
						{...commonExcalidrawProps}
						initialData={{ elements: oldElements || [], appState: {} }}
						theme={resolvedTheme}
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
						{...commonExcalidrawProps}
						initialData={{
							elements: newElements,
							appState: {
								backgroundColor: "#dcfce7",
								viewBackgroundColor: "#dcfce7",
							},
						}}
						theme="light"
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
		<div className="flex-1 flex px-2 pb-2 pt-1">
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
