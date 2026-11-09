import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Open Immune Intelligence",
  description: "Public engineering experience for building, exercising, and understanding Scaniom Immune Fabric.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="app-shell"><AppHeader/><main>{children}</main><footer className="app-footer"><span>OPEN IMMUNE INTELLIGENCE</span><span>Powered by released Scaniom contracts</span></footer></div></body></html>;
}
