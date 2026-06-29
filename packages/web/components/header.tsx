"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Dashboard">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      </svg>
    ),
  },
  {
    name: "Sessions",
    href: "/sessions",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Sessions">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h5.5a2 2 0 002-2V9a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7v10a2 2 0 002 2H9" />
      </svg>
    ),
  },
  {
    name: "Settings",
    href: "/settings",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Settings">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.755 2.872-1.755 3.246 0l.527 2.147a1 1 0 00.956.69h2.178a1.978 1.978 0 001.928-1.427l.825-2.906a1.978 1.978 0 00-1.77-2.465h-2.178a1 1 0 00-.956.69l-.527 2.147zM15 13.5H9a1 1 0 000 2h6a1 1 0 000-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17.27L5.937 20 7 14.074l-5.937-4.074 6.069-.825A1 1 0 018.5 9.05V3.12a1 1 0 011.648-.89l4.957 2.715a1 1 0 01.352.602z" />
      </svg>
    ),
  },
  {
    name: "Captures",
    href: "/captures",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Captures">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h10M7 14h6m-1 8l-4-4m0 0l4-4" />
      </svg>
    ),
  },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="ContextIO logo">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H3m12 0l-3 3m3-3l-3-3" />
            </svg>
          </div>
          <span className="font-bold">ContextIO</span>
        </div>
        <nav className="flex items-center space-x-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}