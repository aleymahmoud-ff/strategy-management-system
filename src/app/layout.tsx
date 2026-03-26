import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { Navbar } from "@/components/layout/navbar";
import { auth } from "@/lib/auth";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-fraunces",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "SEM — Strategy Execution Management",
  description: "Strategic objectives management and reporting platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="dark">
      <body className={`${fraunces.variable} ${outfit.variable} antialiased`}>
        <Providers session={session}>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
