"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import { BarChart3, MessageSquare, LayoutDashboard, FileDown, FlaskConical, History, ChevronDown, LogOut, User } from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard",         label: "Dashboard",  Icon: LayoutDashboard },
  { href: "/chat",              label: "Chat",        Icon: MessageSquare   },
  { href: "/results",           label: "Results",     Icon: BarChart3       },
  { href: "/dashboard/history", label: "History",     Icon: History         },
  { href: "/report",            label: "Report",      Icon: FileDown        },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserEmail(parsed.email ?? null);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSignOut() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    document.cookie = "access_token=; path=/; max-age=0";
    router.push("/login");
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-gray-900">
          <FlaskConical size={20} className="text-blue-600" />
          <span className="text-sm">LLM Eval</span>
        </Link>

        {/* Nav — only shown when logged in */}
        {userEmail && (
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
        )}

        {/* User dropdown — only shown when logged in */}
        {userEmail && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <User size={15} />
              <span className="max-w-[140px] truncate">{userEmail}</span>
              <ChevronDown size={14} className={clsx("transition-transform", dropdownOpen && "rotate-180")} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
