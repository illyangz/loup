import { Link, useLocation } from "wouter"
import { Home, Search, Calendar, Users, FileText, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/hooks/use-theme"
import { useGetHomeSummary, getGetHomeSummaryQueryKey } from "@workspace/api-client-react"

function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        className
      )}
      data-testid="button-theme-toggle"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const { data: summary } = useGetHomeSummary({
    query: { refetchInterval: 15000, queryKey: getGetHomeSummaryQueryKey() },
  })
  const packUnread = summary?.packUnreadCount ?? 0

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/browse", label: "Catalog", icon: Search },
    { href: "/bookings", label: "Bookings", icon: Calendar },
    { href: "/household", label: "The Pack", icon: Users },
    { href: "/billing", label: "Billing", icon: FileText },
  ]

  const isHome = location === "/"
  const isBookings = location === "/bookings" || location.startsWith("/bookings/")

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-[80px] lg:pb-0 relative">
      <div className="absolute inset-0 bg-sunlight pointer-events-none" />

      {/* Desktop Top Bar */}
      <header className="hidden lg:flex h-20 border-b border-border/50 px-6 xl:px-8 items-center justify-between bg-card/60 backdrop-blur-3xl sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-12">
          <Link href="/" className="font-serif text-4xl font-normal tracking-tight text-primary italic">Loup</Link>
          <nav className="flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors py-7 border-b-2",
                    isActive
                      ? "text-primary border-primary"
                      : "text-muted-foreground hover:text-foreground border-transparent"
                  )}
                >
                  <span className="relative inline-flex items-center gap-1.5">
                    {item.label}
                    {item.href === "/household" && packUnread > 0 && (
                      <span
                        data-testid="badge-pack-unread-desktop"
                        className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none"
                      >
                        {packUnread > 9 ? "9+" : packUnread}
                      </span>
                    )}
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>
        <ThemeToggle />
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden px-4 pt-4 relative z-10 flex items-center justify-between">
        <Link href="/" className="font-serif text-3xl font-normal tracking-tight text-primary italic">Loup</Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 w-full mx-auto p-4 lg:p-8 relative z-10",
          (isHome || isBookings) ? "max-w-[1600px]" : "max-w-3xl"
        )}
      >
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-nav flex justify-around items-center px-2 py-3 z-50 pb-safe">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px] transition-all",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <item.icon className={cn("w-6 h-6", isActive && "fill-primary/20")} strokeWidth={isActive ? 2.5 : 2} />
                {item.href === "/household" && packUnread > 0 && (
                  <span
                    data-testid="badge-pack-unread-mobile"
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none"
                  >
                    {packUnread > 9 ? "9+" : packUnread}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
