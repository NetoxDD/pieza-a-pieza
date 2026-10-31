import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import AuthGate from "@/components/AuthGate";
import SettingsProvider from "@/components/SettingsProvider";
import ChildGate from "@/components/ChildGate";
import ChildHeader from "@/components/ChildHeader";
import SectionTabs from "@/components/SectionTabs";
import RegisterSW from "@/components/RegisterSW";
import { INIT_SCRIPT } from "@/lib/settings";
import ProfilesProvider from "@/components/ProfilesProvider";
import Welcome from "@/components/Welcome";
import ChildProfileProvider from "@/components/ChildProfileProvider";

const legible = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-legible",
});

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
    <html lang="es" suppressHydrationWarning className={legible.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <RegisterSW />
        <AuthGate>
          <SettingsProvider>
<ChildGate>
<ProfilesProvider>
  <ChildProfileProvider>
    <Welcome />
    <Nav />
    <div className="md:pl-60 pb-24 md:pb-0">
      <ChildHeader />
      <main className="mx-auto max-w-5xl p-5 md:p-9">
        <SectionTabs />
        {children}
      </main>
    </div>
  </ChildProfileProvider>
</ProfilesProvider>
</ChildGate>
          </SettingsProvider>
        </AuthGate>
      </body>
    </html>
  );
}