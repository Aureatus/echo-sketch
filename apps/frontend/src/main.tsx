import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import DefaultError from "./components/common/DefaultError";
import DefaultLoading from "./components/common/DefaultLoading";
import { PersistGate } from "./components/providers/PersistGate";
import { ThemeProvider } from "./components/providers/ThemeProvider";
import { createIDBPersister } from "./lib/persister";
import "./styles.css";
import reportWebVitals from "./reportWebVitals.ts";

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 10,
			staleTime: 1000 * 60 * 10,
		},
	},
});

const persister = createIDBPersister();

// Create a new router instance
const router = createRouter({
	routeTree,
	context: {
		queryClient,
	},
	defaultPreload: "intent",
	defaultPendingComponent: DefaultLoading,
	defaultErrorComponent: DefaultError,
	scrollRestoration: true,
	defaultStructuralSharing: true,
	defaultPreloadStaleTime: 0,
	defaultPreloadDelay: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
				<PersistQueryClientProvider
					client={queryClient}
					persistOptions={{
						persister,
						maxAge: 1000 * 60 * 10,
					}}
					onError={() => {
						console.error("Error restoring cache");
					}}
				>
					<PersistGate>
						<RouterProvider router={router} />
					</PersistGate>
				</PersistQueryClientProvider>
			</ThemeProvider>
		</StrictMode>,
	);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
