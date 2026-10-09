"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ApiError, fieldErrors } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { AuthShell } from "@/components/auth-shell";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const fields = fieldErrors(undefined);

  async function onSubmit(values: z.infer<typeof schema>) {
    setServerError("");
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    try {
      await login(values.email, values.password, params?.get("inviteToken") ?? undefined);
      toast.success("Welcome back");
    } catch (e) {
      if (e instanceof ApiError) {
        const fe = fieldErrors(e);
        for (const [k, m] of Object.entries(fe)) form.setError(k as "email" | "password", { message: m });
        setServerError(fe.email || fe.password ? "" : e.message);
      } else setServerError("Login failed");
    }
    void fields;
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Log in to your agency workspace or client portal."
      footer={
        <>
          Client? <Link href="/portal/login" className="font-medium text-sage-600 underline underline-offset-4 hover:text-sage-700">Open the client portal</Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          <FieldError message={form.formState.errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
          <FieldError message={form.formState.errors.password?.message} />
        </div>
        {serverError && <p className="text-sm font-medium text-red-600">{serverError}</p>}
        <Button type="submit" size="pill" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Logging in…" : "Login"}
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/register" className="font-medium text-sage-600 underline underline-offset-4 hover:text-sage-700">Create account</Link>
        <Link href="/forgot-password" className="font-medium text-sage-600 underline underline-offset-4 hover:text-sage-700">Forgot password?</Link>
      </div>
    </AuthShell>
  );
}
