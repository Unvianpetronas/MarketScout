interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function ReportPage(
  { params }: Props
) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold">
        Verification Report
      </h1>

      <p className="mt-2 text-muted-foreground">
        Report ID: {id}
      </p>

      <div className="mt-8 rounded-lg border p-6">
        Loading report...
      </div>
    </main>
  );
}