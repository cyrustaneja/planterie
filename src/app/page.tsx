import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function Home() {
  const user = await requireUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl text-pine-deep">Planterie Asset Studio</h1>
      <p className="max-w-md text-sage">
        Signed in as <span className="font-mono text-pine">{user.email}</span> ({user.role}).
      </p>
      <Link href="/upload" className="rounded bg-pine px-4 py-2 font-medium text-canvas">
        Add photos
      </Link>
    </main>
  );
}
