"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startVerification } from "@/services/report.service";

export function VerifyForm() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    await startVerification({
      entityName: companyName,
      countryIso2: country,
    });

    router.push("/reports/demo-report");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div>
        <label className="mb-2 block text-sm font-medium">
          Company Name
        </label>

        <Input
          placeholder="ABC Furniture Import LLC"
          value={companyName}
          onChange={(e) =>
            setCompanyName(e.target.value)
          }
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Country
        </label>

        <Input
          placeholder="United States"
          value={country}
          onChange={(e) =>
            setCountry(e.target.value)
          }
        />
      </div>

      <Button
        type="submit"
        className="w-full"
      >
        Start Verification
      </Button>
    </form>
  );
}
