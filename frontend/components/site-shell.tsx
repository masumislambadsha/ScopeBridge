"use client";

import { usePathname } from "next/navigation";
import { motion, useScroll, useSpring } from "motion/react";
import Navbar from "./navbar";
import { Footer } from "./footer";
import SmoothScroll from "./smooth-scroll";

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
  const isPublic = !PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
  const { scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <>
      {isPublic && (
        <motion.div
          style={{ scaleX: progressScale }}
          className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sage-600 via-teal-500 to-sage-400 origin-left z-[100]"
        />
      )}
      {isPublic && <SmoothScroll />}
      {isPublic && <Navbar />}
      {children}
      {isPublic && <Footer />}
    </>
  );
}
