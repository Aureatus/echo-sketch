import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "../components/layout/Header";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: () => (
		<div className="flex flex-col h-screen">
			<Header />
			<div className="flex-grow">
				<Outlet />
			</div>
			<TanStackRouterDevtools />
			<ReactQueryDevtools buttonPosition="bottom-right" />
		</div>
	),
});
