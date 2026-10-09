"use client";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, CheckCircle2, HeartHandshake, Inbox, ListChecks, FileCheck, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import { Eyebrow } from "@/components/eyebrow";
import { RevealText } from "@/components/reveal-text";
import { Magnetic } from "@/components/magnetic";
import { TiltCard } from "@/components/tilt-card";
import { SpotlightCard } from "@/components/spotlight-card";
import { BlurFade } from "@/components/magicui/blur-fade";
import { Marquee } from "@/components/magicui/marquee";
import { NumberTicker } from "@/components/magicui/number-ticker";

const STEPS = [
  { icon: Inbox, title: "Capture intake", body: "Information requests, submissions and files flow into one project inbox. Nothing lives in email threads." },
  { icon: ListChecks, title: "Approve requirements", body: "AI drafts acceptance criteria — your PMs approve, clarify or reject. Only READY work moves forward." },
  { icon: FileCheck, title: "Lock the scope", body: "Versioned scopes with e-signatures. Change requests hit a firewall: analyze → approve → new version." },
];

const FEATURES = [
  { icon: ShieldCheck, title: "Change-request firewall", body: "No client change becomes work without classification, impact analysis and a new scope version." },
  { icon: FileCheck, title: "Signature approvals", body: "Clients approve scopes in a portal they understand. Every decision is hashed, timestamped, immutable." },
  { icon: ListChecks, title: "Traceability chain", body: "Requirement → scope version → task → change. Prove what was agreed, what changed, and why." },
  { icon: Sparkles, title: "AI-assisted, human-decided", body: "Checklists, readiness scores and acceptance criteria in seconds. AI never approves — people do." },
  { icon: Inbox, title: "Structured intake", body: "Questionnaires with deadlines, reminders and file allowlists. Submissions arrive complete." },
  { icon: PenLine, title: "Audit-ready activity", body: "Append-only log of every approval, task move and message. Filter by project or workspace." },
];

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(heroProgress, [0, 1], [1, 0.4]);
  const heroY = useTransform(heroProgress, [0, 1], [0, 90]);

  return (
    <main className="overflow-x-hidden">
      {/* ---------- HERO ---------- */}
      <div ref={heroRef}>
        <BlurFade inView className="w-full">
          <motion.div style={{ opacity: heroOpacity, y: heroY }} className="pt-32 pb-16 md:pb-24">
            <section className="relative mx-auto max-w-[1320px] px-6 md:px-10">
              <div className="bg-dot-pattern absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" aria-hidden />
              <div className="absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-sage-500/10 blur-[120px]" aria-hidden />
              <div className="absolute -right-32 top-40 h-[420px] w-[420px] rounded-full bg-clay-500/10 blur-[120px]" aria-hidden />

              <div className="relative grid items-center gap-12 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <BlurFade inView>
                    <Eyebrow>Scope management for agencies</Eyebrow>
                  </BlurFade>
                  <h1 className="hero-title mt-5 text-balance">
                    <RevealText pre="Kill scope creep" accent="before it kills" post="your margin." />
                  </h1>
                  <BlurFade inView delay={0.25}>
                    <p className="body-copy mt-6 max-w-xl text-[17px] leading-relaxed">
                      Client input → requirements → AI analysis → approved scope → tasks → change requests → new versions.
                      One traceable chain your clients actually understand.
                    </p>
                  </BlurFade>
                  <BlurFade inView delay={0.35}>
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                      <Magnetic strength={0.2}>
                        <Link href="/register" className="group relative inline-flex items-center gap-1.5 px-7 py-3.5 text-[15px] font-semibold bg-[#1a1a1a] dark:bg-warm-50 text-warm-50 dark:text-[#1a1a1a] rounded-full shadow-lg shadow-black/10 dark:shadow-white/10 hover:bg-[#2a2a2a] dark:hover:bg-warm-100 transition-all duration-300 active:scale-[0.97]">
                          Start free <ArrowRight size={17} />
                        </Link>
                      </Magnetic>
                      <Magnetic strength={0.2}>
                        <Link href="/portal/login" className="rounded-full border border-warm-200 bg-white/70 px-7 py-3.5 font-semibold backdrop-blur transition-colors hover:border-sage-300 hover:bg-sage-50/40">
                          Client portal
                        </Link>
                      </Magnetic>
                      <Link href="/login" className="px-2 text-sm font-medium text-warm-600 underline-offset-4 hover:underline">
                        Login
                      </Link>
                    </div>
                  </BlurFade>
                  <BlurFade inView delay={0.45}>
                    <dl className="mt-10 flex flex-wrap gap-8">
                      {[[42, "scope versions locked", "+"], [18, "change requests firewalled", "+"], [99, "% approvals traceable", "%"]].map(([v, label, suffix]) => (
                        <div key={label as string}>
                          <dt className="sr-only">{label as string}</dt>
                          <dd className="font-serif text-3xl text-ink dark:text-warm-50">
                            <NumberTicker value={v as number} />{suffix as string}
                          </dd>
                          <dd className="text-sm text-warm-500">{label as string}</dd>
                        </div>
                      ))}
                    </dl>
                  </BlurFade>
                </div>

                <div className="lg:col-span-5">
                  <BlurFade inView delay={0.25}>
                    <div className="relative">
                      <TiltCard max={7} className="rounded-[2rem]">
                        <div className="relative rounded-[2rem] border border-warm-200/70 bg-white/90 p-6 shadow-soft backdrop-blur-2xl dark:bg-[#161310]">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-600 text-white"><HeartHandshake size={17} /></span>
                            <div>
                              <p className="text-sm font-semibold">Website rebuild — Acme Co</p>
                              <p className="text-xs text-warm-500">Scope v3 · awaiting signature</p>
                            </div>
                            <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Pending</span>
                          </div>
                          <div className="mt-5 grid gap-2.5 text-sm">
                            {[
                              ["REQ-001", "Client provides brand assets", "READY", "bg-blue-50 text-blue-700"],
                              ["REQ-002", "Checkout with 3 payment methods", "APPROVED", "bg-emerald-50 text-emerald-700"],
                              ["CR-001", "Add multi-currency at checkout", "UNDER REVIEW", "bg-amber-50 text-amber-800"],
                            ].map(([code, title, status, cls]) => (
                              <div key={code as string} className="flex items-center gap-2.5 rounded-2xl border border-warm-200/60 px-3.5 py-2.5">
                                <span className="font-mono text-xs text-warm-500">{code}</span>
                                <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{status}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-ink p-3.5 text-sm text-warm-50 dark:bg-sage-600">
                            <CheckCircle2 size={16} />
                            <span className="font-medium">Traceability: 100% linked</span>
                            <ArrowRight size={15} className="ml-auto" />
                          </div>
                        </div>
                      </TiltCard>
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -right-4 -top-4 rounded-full border border-warm-200/70 bg-white px-4 py-2 text-xs font-semibold shadow-xl"
                      >
                        ✍️ Signed 2 min ago
                      </motion.div>
                      <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                        className="absolute -left-5 bottom-10 rounded-full border border-warm-200/70 bg-white px-4 py-2 text-xs font-semibold shadow-xl"
                      >
                        🛡️ CR firewall on
                      </motion.div>
                    </div>
                  </BlurFade>
                </div>
              </div>
            </section>
          </motion.div>
        </BlurFade>
      </div>

      {/* ---------- TRUST MARQUEE ---------- */}
      <BlurFade inView>
        <section className="border-y border-warm-200/60 bg-warm-100/60 py-5">
          <Marquee pauseOnHover className="[--duration:35s]">
            {["Information requests", "AI readiness", "E-signatures", "Traceability", "Change firewall", "Client portal", "Audit log", "Task boards"].map((t) => (
              <span key={t} className="mx-4 flex items-center gap-2 whitespace-nowrap font-serif text-lg text-warm-600">
                <span className="h-1.5 w-1.5 rounded-full bg-sage-500" /> {t}
              </span>
            ))}
          </Marquee>
        </section>
      </BlurFade>

      {/* ---------- STATS BAND ---------- */}
      <BlurFade inView>
        <section className="mx-auto max-w-[1320px] px-6 md:px-10 pt-16">
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[[128, "projects delivered"], [96, "happy agency clients"], [12, "avg. days to lock scope"], [4.9, "client rating"]].map(([v, label]) => (
              <div key={label as string} className="rounded-3xl border border-warm-200/70 bg-white p-6 text-center shadow-card dark:bg-[#161310]">
                <dd className="font-serif text-4xl text-ink dark:text-warm-50">
                  <NumberTicker value={v as number} decimalPlaces={Number.isInteger(v) ? 0 : 1} />
                </dd>
                <dt className="mt-1 text-sm text-warm-500">{label as string}</dt>
              </div>
            ))}
          </dl>
        </section>
      </BlurFade>

      {/* ---------- HOW ---------- */}
      <section id="how" className="mx-auto max-w-[1320px] scroll-mt-28 px-6 py-20 md:px-10 md:py-28">
        <div className="text-center">
          <BlurFade inView>
            <Eyebrow className="justify-center">How it works</Eyebrow>
          </BlurFade>
          <RevealText
            className="section-title mx-auto mt-4 max-w-2xl text-balance"
            pre="From messy inbox to"
            accent="locked scope"
            post="in three steps."
          />
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <BlurFade inView delay={i * 0.08} key={s.title}>
              <SpotlightCard className="h-full rounded-3xl border border-warm-200/70 bg-white p-7 shadow-card dark:bg-[#161310]">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 dark:bg-white/10">
                  <s.icon size={20} />
                </span>
                <p className="mt-4 font-mono text-xs text-warm-400">0{i + 1}</p>
                <h3 className="mt-1 font-serif text-2xl text-ink dark:text-warm-50">{s.title}</h3>
                <p className="body-copy mt-2 text-[15px] leading-relaxed">{s.body}</p>
              </SpotlightCard>
            </BlurFade>
          ))}
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="features" className="border-y border-warm-200/60 bg-warm-100/60 scroll-mt-20">
        <div className="mx-auto max-w-[1320px] px-6 py-20 md:px-10 md:py-28">
          <BlurFade inView>
            <Eyebrow>Features</Eyebrow>
          </BlurFade>
          <RevealText
            className="section-title mt-4 max-w-2xl"
            pre="Everything between"
            accent="“yes, client”"
            post="and “that’s extra”."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <BlurFade inView delay={(i % 3) * 0.08} key={f.title}>
                <SpotlightCard className="group h-full rounded-3xl border border-warm-200/70 bg-white p-7 shadow-card transition-all hover:-translate-y-1 hover:shadow-soft dark:bg-[#161310]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage-600/10 text-sage-700 transition-colors group-hover:bg-sage-600 group-hover:text-white">
                    <f.icon size={20} />
                  </span>
                  <h3 className="mt-4 font-serif text-xl text-ink dark:text-warm-50">{f.title}</h3>
                  <p className="body-copy mt-2 text-[15px] leading-relaxed">{f.body}</p>
                </SpotlightCard>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PORTAL (dark) ---------- */}
      <section id="portal" className="mx-auto max-w-[1320px] scroll-mt-28 px-6 py-20 md:px-10 md:py-28">
        <BlurFade inView delay={0.1}>
          <div className="relative overflow-hidden rounded-[2.5rem] bg-ink p-8 text-warm-50 md:p-14">
            <div className="bg-dot-pattern absolute inset-0 opacity-[0.07]" aria-hidden />
            <div className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-sage-600/20 blur-[160px]" aria-hidden />
            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Eyebrow dark>Client portal</Eyebrow>
                <h2 className="mt-4 font-serif text-4xl leading-[1.05] md:text-5xl">
                  Clients approve in <span className="italic text-sage-300">one click.</span> You keep the paper trail.
                </h2>
                <ul className="mt-6 grid gap-2.5 text-[15px] text-warm-300">
                  {["Answer questionnaires & upload files", "E-sign scopes with name + comment", "Raise change requests without email chaos"].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <CheckCircle2 size={17} className="shrink-0 text-teal-400" /> {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/portal/login" className="rounded-full bg-warm-50 px-7 py-3.5 font-semibold text-ink transition-transform hover:scale-[1.02] active:scale-[0.98]">
                    Open client portal
                  </Link>
                  <Link href="/register" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 font-semibold transition-colors hover:bg-white/10">
                    Create agency account
                  </Link>
                </div>
              </div>
              <SpotlightCard glow="rgba(255,255,255,0.07)" size={200} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-sage-300">Scope v3 — approval</p>
                <p className="mt-2 font-serif text-2xl">“Approved — ship it.”</p>
                <p className="mt-1 text-sm text-warm-400">Sarah K. · Acme Co · signed Apr 12, 14:32 · hash 9f3a…c1</p>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300">Approve</span>
                  <span className="rounded-full bg-white/5 px-4 py-2 text-sm text-warm-300">Request changes</span>
                  <span className="rounded-full bg-white/5 px-4 py-2 text-sm text-warm-300">Reject</span>
                </div>
              </SpotlightCard>
            </div>
          </div>
        </BlurFade>
      </section>

      {/* ---------- PRICING ---------- */}
      <section id="pricing" className="mx-auto max-w-[1320px] scroll-mt-28 px-6 pb-20 md:px-10 md:pb-28">
        <div className="text-center">
          <BlurFade inView>
            <Eyebrow className="justify-center">Pricing</Eyebrow>
          </BlurFade>
          <RevealText
            className="section-title mx-auto mt-4"
            pre="One lost scope pays for"
            accent="a year"
            post="of ScopeBridge."
          />
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            ["Starter", "$29", "For solo freelancers", ["3 active projects", "Client portal + signatures", "AI checklists"], false],
            ["Studio", "$79", "For growing agencies", ["Unlimited projects", "Change-request firewall", "Traceability + audit log", "Task boards"], true],
            ["Scale", "Custom", "For multi-team shops", ["SSO & roles", "Priority support", "Migration help"], false],
          ].map(([name, price, hint, perks, featured]) => (
            <BlurFade inView delay={0.1} key={name as string}>
              <SpotlightCard
                glow={featured ? "rgba(255,255,255,0.07)" : "rgba(74,124,116,0.12)"}
                size={200}
                className={`h-full rounded-[2rem] border p-8 ${featured ? "border-sage-600 bg-ink text-warm-50 shadow-soft" : "border-warm-200/70 bg-white shadow-card"}`}
              >
                <p className={`font-serif text-xl ${featured ? "text-warm-50" : "text-ink"}`}>{name as string}</p>
                <p className="mt-2 font-serif text-4xl">{price as string}</p>
                <p className={`mt-1 text-sm ${featured ? "text-warm-400" : "text-warm-500"}`}>{hint as string}</p>
                <ul className="mt-5 grid gap-2 text-[15px]">
                  {(perks as string[]).map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <CheckCircle2 size={16} className={featured ? "text-teal-400" : "text-sage-600"} /> {p}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`mt-6 block rounded-full py-3 text-center font-semibold transition-transform hover:scale-[1.01] active:scale-[0.99] ${featured ? "bg-warm-50 text-ink" : "bg-ink text-warm-50"}`}>
                  Get started
                </Link>
              </SpotlightCard>
            </BlurFade>
          ))}
        </div>

        <BlurFade inView>
          <div className="mt-16 rounded-[2.5rem] border border-warm-200/70 bg-white p-8 text-center shadow-card md:p-14 dark:bg-[#161310]">
            <RevealText
              className="section-title mx-auto max-w-2xl"
              pre="Stop writing free work into"
              accent="fixed-price contracts."
            />
            <p className="body-copy mx-auto mt-3 max-w-xl">Set up your first project in 5 minutes. Invite the client. Lock the scope.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Magnetic strength={0.2}>
                <Link href="/register" className="inline-block rounded-full bg-sage-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-sage-600/25 transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  Start free today
                </Link>
              </Magnetic>
              <Link href="/login" className="rounded-full border border-warm-200 px-8 py-3.5 font-semibold transition-colors hover:border-sage-300">
                Login
              </Link>
            </div>
          </div>
        </BlurFade>
      </section>
    </main>
  );
}
