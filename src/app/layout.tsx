import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GritGauge — AI Co-Pilot for Open Source Maintainers",
  description:
    "Automate issue triage, PR reviews, release notes, and project health tracking with AI. Built for open-source maintainers who want to ship faster.",
  keywords: [
    "open source",
    "maintainer tools",
    "AI triage",
    "PR review",
    "GitHub analytics",
    "developer tools",
    "project health",
  ],
  openGraph: {
    title: "GritGauge — AI Co-Pilot for Open Source Maintainers",
    description:
      "Automate issue triage, PR reviews, release notes, and project health tracking with AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
