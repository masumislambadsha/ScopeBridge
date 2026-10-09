"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { AuthShell } from "@/components/auth-shell";

const schema = z.object({ email: z.string().email("Enter a valid email") });

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  async function onSubmit(values: z.infer<typeof schema>) {
    await api.post("/api/auth/forgot-password", values);
    setDone(true);
  }

  return (
    <AuthShell
      title="Forgot password"
      description="We email you a reset link if the account exists."
      footer={
        <Link href="/login" className="font-medium text-sage-600 underline underline-offset-4 hover:text-sage-700">Back to login</Link>
      }
    >
      {done ? (
        <p className="text-[15px] leading-relaxed text-warm-700">If an account exists for that email, a reset link is on its way.</p>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            <FieldError message={form.formState.errors.email?.message} />
          </div>
          <Button type="submit" size="pill" disabled={form.formState.isSubmitting}>Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}
