import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./Providers";
import { Nav } from "../components/Nav";

export const metadata: Metadata = { title: "Web3Bridge Day 3 dApp" };

// Every page of the app is drawn inside this layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-shell">
        <Providers>
          <Nav />
          <main className="main-container">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
