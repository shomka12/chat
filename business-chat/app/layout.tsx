import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { UploadProvider } from "@/components/providers/UploadProvider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Business Chat - Secure Messaging",
  description: "Secure business messaging with hierarchy, files, and emojis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <AuthProvider>
          <UploadProvider>
            {children}
            <Toaster richColors position="top-right" />
          </UploadProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
