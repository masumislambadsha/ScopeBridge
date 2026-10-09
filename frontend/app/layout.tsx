import "./globals.css";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { WorkspaceProvider } from "@/lib/workspace";
import { QueryProvider } from "@/lib/query";
import { SocketProvider } from "@/lib/socket";
import { ThemeInitializer } from "@/lib/theme";
import { SiteShell } from "@/components/site-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export const metadata = { title: "ScopeBridge — kill scope creep", description: "Client input → requirements → approved scope → tasks → change requests. One traceable chain." };

function themeScript() {
  return `(function(){try{var t=localStorage.getItem('scopebridge-theme')||'light';if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
      </head>
      <body className="min-h-screen bg-warm-50 font-sans text-warm-800 antialiased">
        <ThemeInitializer>
          <QueryProvider>
            <AuthProvider>
              <WorkspaceProvider>
                <SocketProvider>
                  <SiteShell>{children}</SiteShell>
                </SocketProvider>
              </WorkspaceProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeInitializer>
        <Toaster position="bottom-center" toastOptions={{ style: { borderRadius: "12px", fontFamily: "inherit" } }} richColors closeButton />
      </body>
    </html>
  );
}
