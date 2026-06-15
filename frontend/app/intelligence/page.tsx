"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Intelligence hub index — redirect to reports (list of all intelligence reports)
export default function IntelligenceIndexPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/reports"); }, [router]);
  return (
    <div className="h-screen flex items-center justify-center bg-[#FAFBFA]">
      <div className="w-8 h-8 border-2 border-[#00D26A]/20 border-t-[#00D26A] rounded-full animate-spin" />
    </div>
  );
}
