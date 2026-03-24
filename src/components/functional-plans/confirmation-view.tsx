import Link from "next/link";

type Props = {
  departmentName: string;
  periodLabel: string;
  submittedAt: string | null;
};

export function ConfirmationView({
  departmentName,
  periodLabel,
  submittedAt,
}: Props) {
  const date = submittedAt
    ? new Date(submittedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Just now";

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="animate-scale-in w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-bg">
          <svg
            className="h-8 w-8 text-green"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h2 className="font-heading text-2xl font-bold text-text-hd">
          Report Submitted
        </h2>
        <p className="mt-2 text-[13px] text-text-sub">
          {departmentName} functional plan for {periodLabel} has been submitted
          successfully.
        </p>
        <p className="mt-1 text-[12px] text-text-mut">Submitted on {date}</p>

        <Link
          href="/functional-plans"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brown px-6 py-2.5 text-[13px] font-semibold text-bg-page transition-all duration-200 hover:bg-brown-dk hover:shadow-[0_0_20px_rgba(201,162,77,0.2)]"
        >
          Back to Portal
        </Link>
      </div>
    </main>
  );
}
