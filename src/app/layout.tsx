import type { Metadata } from "next";
import { Fraunces, Inter, Geist_Mono } from "next/font/google";
import { getCurrentUser } from "@/lib/get-current-user";
import { signOut } from "@/app/actions/sign-out";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Planterie Asset Studio",
  description: "Capture, tag, search, and share Planterie's photos and videos.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {user ? (
          <header className="flex items-center justify-between border-b border-line px-6 py-3">
            <span className="font-display text-lg text-pine-deep">Planterie</span>
            <div className="flex items-center gap-4 text-sm text-sage">
              <span className="font-mono">{user.email}</span>
              <form action={signOut}>
                <button type="submit" className="text-pine hover:underline">
                  Sign out
                </button>
              </form>
            </div>
          </header>
        ) : null}
        {children}
      </body>
    </html>
  );
}
