import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Chat Playground",
    template: "%s | AI Copilot",
  },
  description: "AI Copilot playground pages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
