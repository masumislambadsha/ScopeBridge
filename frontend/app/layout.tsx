import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { SocketProvider } from '@/lib/socket';

export const metadata = { title: 'ScopeBridge', description: 'Client-to-development workflow & scope management' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900">
        <AuthProvider>
          <SocketProvider>{children}</SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
