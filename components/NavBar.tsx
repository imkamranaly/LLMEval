"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BarChart3, MessageSquare, LayoutDashboard, FileDown, FlaskConical, History } from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard",         label: "Dashboard",  Icon: LayoutDashboard },
  { href: "/chat",              label: "Chat",        Icon: MessageSquare   },
  { href: "/results",           label: "Results",     Icon: BarChart3       },
  { href: "/dashboard/history", label: "History",     Icon: History         },
  { href: "/report",            label: "Report",      Icon: FileDown        },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-gray-900">
          <FlaskConical size={20} className="text-blue-600" />
          <span className="text-sm">LLM Eval</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
