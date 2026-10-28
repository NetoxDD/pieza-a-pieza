import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import AuthGate from "@/components/AuthGate";
import SignOutButton from "@/components/SignOutButton";

export const metadata: Metadata = {
  title: "Pieza a pieza",
  description: "Seguimiento compartido para familias y profesionales",
};

export const viewport: Viewport = {
  themeColor: "#426f5d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-[var(--background)] text-[var(--text)] antialiased">
        <AuthGate>
          <Nav />
          <div className="md:pl-60 pb-24 md:pb-0">
            <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 md:px-9">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--sage)] text-xs font-bold text-[var(--primary)]">
                  ML
                </span>
                <div className="leading-tight">
                  <strong className="block text-sm">Mateo López</strong>
                  <small className="text-xs text-[var(--muted)]">
                    Su espacio de seguimiento
                  </small>
                </div>
              </div>
              <SignOutButton />
            </header>
            <main className="mx-auto max-w-5xl p-5 md:p-9">{children}</main>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}