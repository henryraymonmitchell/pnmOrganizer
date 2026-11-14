import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rush — Your IFC guide",
  description: "The official home for IFC rush."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
