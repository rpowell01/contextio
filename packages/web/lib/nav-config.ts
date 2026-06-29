import { ReactNode } from "react";

export interface NavigationItem {
  name: string;
  href: string;
  icon?: ReactNode;
}

export const navigation: NavigationItem[] = [
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