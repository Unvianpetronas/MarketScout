import { VerifyForm } from "@/components/verify/verify-form";

export default function VerifyPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Verify a Trading Partner
        </h1>

        <p className="mt-2 text-muted-foreground">
          Analyze a company across
          MarketScout's trust pillars.
        </p>
      </div>

      <VerifyForm />
    </main>
  );
}