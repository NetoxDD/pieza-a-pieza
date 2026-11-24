import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Fraunces, IBM_Plex_Sans, Nunito } from "next/font/google";
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
import TodayProvider from "@/components/TodayProvider";
import ChildProfileProvider from "@/components/ChildProfileProvider";
import InviteCapture from "@/components/InviteCapture";
import SyncBanner from "@/components/SyncBanner";

const legible = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-legible",
});

const atkinson = Atkinson_Hyperlegible({ weight: ["400", "700"], subsets: ["latin"], display: "swap", variable: "--font-atkinson" });
const fraunces = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-fraunces" });
const plex = IBM_Plex_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], display: "swap", variable: "--font-plex" });
const nunito = Nunito({ subsets: ["latin"], display: "swap", variable: "--font-nunito" });

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
    <html lang="es" suppressHydrationWarning className={`${legible.variable} ${atkinson.variable} ${fraunces.variable} ${plex.variable} ${nunito.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <RegisterSW />
        <InviteCapture />
        <AuthGate>
          <SettingsProvider>
<ChildGate>
<ProfilesProvider>
<ChildProfileProvider>
  <TodayProvider>
    <Welcome />
    <ChildHeader />
    <Nav />
    <div className="side-pad pb-24 md:pb-0 md:pl-[var(--side-w)]">
      <SyncBanner />
      <main className="mx-auto max-w-5xl p-5 md:p-9">
        <SectionTabs />
        {children}
      </main>
    </div>
  </TodayProvider>
</ChildProfileProvider>
</ProfilesProvider>
</ChildGate>
          </SettingsProvider>
        </AuthGate>
      </body>
    </html>
  );
}