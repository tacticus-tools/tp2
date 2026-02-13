import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/1-components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/1-components/ui/dropdown-menu";
import { useUserPreferencesStore } from "@/3-hooks/useUserPreferencesStore";

function getSystemTheme() {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyTheme(theme: "dark" | "light" | "system") {
	const rootClassList = document.documentElement.classList;
	rootClassList.remove("light", "dark");
	rootClassList.add(theme === "system" ? getSystemTheme() : theme);
}

export function ThemeToggle() {
	const { theme, setTheme } = useUserPreferencesStore();

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	// Listen to system theme changes when theme is set to "system"
	useEffect(() => {
		if (theme !== "system") return;
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => {
			applyTheme(theme);
		};
		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
					<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => setTheme("light")}>
					Light
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("dark")}>
					Dark
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("system")}>
					System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
