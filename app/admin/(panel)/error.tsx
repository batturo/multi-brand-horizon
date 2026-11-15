"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded border-2 border-red-700 bg-white p-4">
      <h1 className="font-bold">Something went wrong</h1>
      <p className="mt-1 text-sm">{error.message.includes("log in") ? error.message : "Please try again."}</p>
      <button onClick={reset} className="mt-3 rounded bg-ink px-4 py-2 font-semibold text-white">
        Try again
      </button>
    </div>
  );
}
