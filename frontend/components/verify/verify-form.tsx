"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VerifyForm() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    // Route to the verify search page; deep verification runs through the AI chat pipeline
    const params = new URLSearchParams({ q: companyName, country });
    router.push(`/verify?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium">Company Name</label>
        <Input
          placeholder="ABC Furniture Import LLC"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Country</label>
        <Input
          placeholder="VN, US, DE…"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full">
        Search Partners
      </Button>
    </form>
  );
}
