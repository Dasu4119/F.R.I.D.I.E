"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { document.title = "Error — F.R.I.D.I.E."; }, []);
  return (
    <main className="grid min-h-[70svh] place-items-center px-6 py-20">
      <section className="max-w-lg rounded-2xl border bg-card p-8 text-card-foreground" role="alert">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">Route error</p>
        <h1 className="text-3xl font-semibold tracking-tight">The command center could not finish loading.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Your goal has not been executed. Retry the page safely.</p>
        <Button className="mt-6" onClick={reset}>Retry loading</Button>
      </section>
    </main>
  );
}
