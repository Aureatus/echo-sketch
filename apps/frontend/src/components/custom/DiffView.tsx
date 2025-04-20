import { Excalidraw } from "@excalidraw/excalidraw";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ApprovalHeader } from "./ApprovalHeader";

export function ExcalidrawWrapper({
	elements,
	theme,
	version,
	children,
}: {
	elements: unknown[];
	theme: "light" | "dark";
	version: "current" | "new";
	children?: React.ReactNode;
}) {
	return (
		<Card className="flex flex-col flex-1 m-1">
			<CardHeader className="flex justify-between items-center">
				<CardTitle>{version}</CardTitle>
				{version === "new" && children}
			</CardHeader>
			<CardContent className="flex-1">
				<Excalidraw
					initialData={{
						elements,
						appState:
							version === "new"
								? { backgroundColor: "#dcfce7", viewBackgroundColor: "#dcfce7" }
								: {},
					}}
					theme={version === "new" ? "light" : theme}
					viewModeEnabled={true}
					zenModeEnabled={true}
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
				<ExcalidrawWrapper
					elements={oldElements || []}
					theme={resolvedTheme}
					version={"current"}
				/>
				<ExcalidrawWrapper
					key={newVersionKey}
					elements={newElements}
					theme={resolvedTheme}
					version={"new"}
				>
					<ApprovalHeader approve={approve} retry={retry} decline={decline} />
				</ExcalidrawWrapper>
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
			<Card className="flex flex-col flex-1 m-1">
				<CardHeader>
					<CardTitle>Current</CardTitle>
				</CardHeader>
				<CardContent>
					<div ref={currentRef} />
				</CardContent>
			</Card>
			<Card className="flex flex-col flex-1 m-1">
				<CardHeader className="flex justify-between items-center">
					<CardTitle>New</CardTitle>
					<ApprovalHeader approve={approve} retry={retry} decline={decline} />
				</CardHeader>
				<CardContent>
					<div ref={newRef} />
				</CardContent>
			</Card>
		</div>
	);
}
