import { createContext, useContext, useEffect, useState } from "react"

/**
 * P1-17: dashboard-wide light/dark toggle for the Altitude design system.
 * Dark is the default (matches :root in index.css); `.light` on
 * <html> is the opt-in override. Persisted to localStorage.
 */
type Theme = "dark" | "light"

const STORAGE_KEY = "loup-app-theme"

type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark"
    return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark"
  })

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light")
  }, [theme])

  const toggleTheme = () => {
    setThemeState((t) => {
      const next = t === "dark" ? "light" : "dark"
      window.localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
