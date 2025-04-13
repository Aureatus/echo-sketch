import type { ErrorComponentProps } from "@tanstack/react-router";

export default function DefaultError({ error }: ErrorComponentProps) {
	console.error(error);

	return (
		<div className="p-4 text-center text-red-600 flex flex-col items-center justify-center h-full">
			<p className="text-xl font-semibold">Something went wrong:</p>
			<p className="text-lg">
				<i>{error.message}</i>
			</p>
		</div>
	);
}
