import "./globals.css";

import { AppShell } from "@/components/app-shell";

export const metadata = {
  title: "Soko Motors Kenya",
  description:
    "A trust-first Kenyan car marketplace with verified sellers, dealer tools, featured listings, and pricing intelligence."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
