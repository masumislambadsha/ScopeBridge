import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="bg-dot-pattern absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" aria-hidden />
      <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-sage-500/10 blur-[120px]" aria-hidden />
      <div className="absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-clay-500/10 blur-[120px]" aria-hidden />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-600 to-teal-600 text-white">
            <HeartHandshake size={20} />
          </span>
          <span className="font-serif text-2xl text-ink dark:text-warm-50">ScopeBridge</span>
        </Link>
        <Card className="rounded-[2rem] p-2 shadow-soft">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        {footer && <div className="mt-4 text-center text-sm text-warm-600 dark:text-warm-400">{footer}</div>}
      </div>
    </main>
  );
}
