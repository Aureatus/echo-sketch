import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const USER_ID_KEY = "anonymousUserId";

export function getOrCreateUserId(): string {
	let userId = localStorage.getItem(USER_ID_KEY);
	if (!userId) {
		userId = crypto.randomUUID();
		localStorage.setItem(USER_ID_KEY, userId);
	}

	return userId;
}
