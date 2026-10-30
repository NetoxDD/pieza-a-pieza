import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import AuthGate from "@/components/AuthGate";
import ChildGate from "@/components/ChildGate";
import ChildHeader from "@/components/ChildHeader";
import RegisterSW from "@/components/RegisterSW";

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
        <RegisterSW />
        <AuthGate>
          <ChildGate>
            <Nav />
            <div className="md:pl-60 pb-24 md:pb-0">
              <ChildHeader />
              <main className="mx-auto max-w-5xl p-5 md:p-9">{children}</main>
            </div>
          </ChildGate>
        </AuthGate>
      </body>
    </html>
  );
}