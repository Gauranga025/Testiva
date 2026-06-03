import { ClerkProvider } from '@clerk/nextjs';
// @ts-ignore
import "./globals.css";
import type { Metadata } from "next";
import Provider from './provider';

export const metadata: Metadata = {
  title: "Testiva - AI Test Automation",
  description: "AI Test Automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, padding: 0 }}>
          <Provider>
          {children}
          </Provider>
        </body>
      </html>
    </ClerkProvider>
  );
}
