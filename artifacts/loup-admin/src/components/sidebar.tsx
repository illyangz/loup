import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  Building2, 
  Users, 
  BookOpen, 
  Calendar, 
  Wallet,
  Command,
  ShieldAlert,
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Overview", icon: Activity },
    { href: "/institutions", label: "Institutions", icon: Building2 },
    { href: "/providers", label: "Providers", icon: Users },
    { href: "/catalog", label: "Catalog", icon: BookOpen },
    { href: "/bookings", label: "Bookings", icon: Calendar },
    { href: "/ledger", label: "Ledger", icon: Wallet },
    { href: "/incidents", label: "Incidents", icon: ShieldAlert },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card/50">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-lg text-primary">
          <Command className="h-5 w-5" />
          <span>Loup Admin</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {links.map((link) => {
          const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
            AD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Admin User</span>
            <span className="text-xs text-muted-foreground">Operations</span>
          </div>
        </div>
      </div>
    </div>
  );
}
