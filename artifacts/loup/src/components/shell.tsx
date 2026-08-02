import { Link, useLocation } from "wouter"
import { Home, Search, Calendar, Users, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  
  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/browse", label: "Catalog", icon: Search },
    { href: "/bookings", label: "Bookings", icon: Calendar },
    { href: "/household", label: "The Pack", icon: Users },
    { href: "/billing", label: "Billing", icon: FileText },
  ]

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-[80px] md:pb-0 md:pl-[240px]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] fixed top-0 left-0 h-screen border-r border-border bg-card/50 backdrop-blur-xl">
        <div className="p-8">
          <Link href="/" className="font-serif text-3xl font-medium tracking-tight text-primary">Loup</Link>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-nav flex justify-around items-center px-2 py-3 z-50 pb-safe">
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
              <item.icon className={cn("w-6 h-6", isActive && "fill-primary/20")} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}