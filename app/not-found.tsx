import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[70svh] place-items-center px-6 py-20">
      <section className="max-w-lg rounded-2xl border bg-card p-8 text-card-foreground">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">404 · Route not found</p>
        <h1 className="text-3xl font-semibold tracking-tight">This workspace route does not exist.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">The feature may not be part of the v0.1 foundation yet.</p>
        <Link className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/">Return to command center</Link>
      </section>
    </main>
  );
}
