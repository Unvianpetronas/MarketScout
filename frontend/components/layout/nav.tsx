"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, LogOut, User, BarChart2 } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";

export function AppNav() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white sticky top-0 z-50">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#00D26A] flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-lg">MarketScout</span>
      </Link>

      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Search companies..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) router.push(`/verify?q=${encodeURIComponent(v)}`);
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
            <span>{user.quotaRemaining} Queries Left</span>
          </div>
        )}

        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
          <Bell className="w-4 h-4 text-gray-600" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <User className="w-4 h-4 text-emerald-700" />
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user?.fullName?.split(" ")[0] || "User"}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </nav>
  );
}
