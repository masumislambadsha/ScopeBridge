import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { WorkspaceProvider } from "@/lib/workspace";
import { QueryProvider } from "@/lib/query";
import { SocketProvider } from "@/lib/socket";

export const metadata = { title: "ScopeBridge", description: "Client-to-development workflow and scope management" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
        <QueryProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <SocketProvider>{children}</SocketProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </QueryProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
