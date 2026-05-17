
import type { ThemePreference } from "@/stores/theme-store"
import { buttonVariants } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useThemeStore } from "@/stores/theme-store"

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
]

export function ThemeSwitcher() {
    const preference = useThemeStore((state) => state.preference)
    const setPreference = useThemeStore((state) => state.setPreference)
    const activeTheme =
        themeOptions.find((option) => option.value === preference) ??
        themeOptions[0]

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={buttonVariants({ variant: "outline", size: "sm" })}
                aria-label="Change color theme"
                title="Change color theme"
            >
                Theme: {activeTheme.label}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>Theme</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                        value={preference}
                        onValueChange={(value) =>
                            setPreference(value as ThemePreference)
                        }
                    >
                        {themeOptions.map((option) => (
                            <DropdownMenuRadioItem
                                key={option.value}
                                value={option.value}
                            >
                                {option.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
