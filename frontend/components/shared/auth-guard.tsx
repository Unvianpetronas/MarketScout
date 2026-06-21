"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

export function AuthGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const hasRole = !requiredRole || user?.role?.toUpperCase() === requiredRole.toUpperCase();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (requiredRole && !hasRole) { router.replace("/dashboard"); }
  }, [isAuthenticated, isLoading, hasRole, requiredRole, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00D26A] flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-sm">MS</span>
          </div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requiredRole && !hasRole) return null;

  return <>{children}</>;
}
