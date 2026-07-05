import { requireUser } from "@/lib/auth";

export default async function Home() {
  const user = await requireUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl text-pine-deep">Planterie Asset Studio</h1>
      <p className="max-w-md text-sage">
        Signed in as <span className="font-mono text-pine">{user.email}</span> ({user.role}).
      </p>
      <code className="rounded border border-line bg-surface px-3 py-1 font-mono text-sm text-pine">
        scaffold ready
      </code>
    </main>
  );
}
