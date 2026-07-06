import { requireUser } from "@/lib/auth";
import { UploadFlow } from "@/app/upload/upload-flow";

export default async function UploadPage() {
  await requireUser();

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-6 py-10">
      <h1 className="font-display text-3xl text-pine-deep">Add photos</h1>
      <UploadFlow />
    </main>
  );
}
