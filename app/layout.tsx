import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { AuthGuard } from "@/components/auth-guard";
import { Toaster } from "sonner";
import { Roboto_Slab } from "next/font/google";
import { NavigationDock } from "@/components/navigation-dock";
import { Alert, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "ZeroOps",
  description:
    "Visual drag-and-drop infrastructure designer with Terraform export",
};

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  variable: "--font-roboto-slab",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${robotoSlab.variable} ${robotoSlab.className} min-h-screen bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="flex h-screen w-screen items-center justify-center p-4 xl:hidden z-10 relative">
            <Alert
              className="border-destructive/50 text-destructive text-2xl text-center justify-center content-center"
              variant="destructive"
            >
              <AlertTitle>Access Denied On Mobile</AlertTitle>
            </Alert>
          </div>
          <div className="hidden xl:block relative z-10">
            <AuthProvider>
              <AuthGuard>{children}</AuthGuard>
              <NavigationDock />
            </AuthProvider>
            <Toaster
              position="top-right"
              richColors
              closeButton
              expand={true}
              duration={3000}
            />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
