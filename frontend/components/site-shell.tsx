"use client";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SmoothScroll } from "@/components/smooth-scroll";

const PRIVATE_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/dashboard",
  "/projects",
  "/clients",
  "/tasks",
  "/activity",
  "/profile",
  "/settings",
  "/workspaces",
  "/notifications",
  "/portal",
  "/invite",
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPrivate = PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));

  if (isPrivate) return <>{children}</>;

  return (
    <>
      <SmoothScroll />
      <Navbar />
      <div className="pt-20">{children}</div>
      <Footer />
    </>
  );
}
