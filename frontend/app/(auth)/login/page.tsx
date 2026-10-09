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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>ScopeBridge</CardTitle>
          <CardDescription>Log in to your agency workspace or client portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
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
            {serverError && <p className="text-sm text-red-600">{serverError}</p>}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Logging in…" : "Login"}
            </Button>
          </form>
          <div className="mt-3 flex justify-between text-sm">
            <Link href="/register" className="underline">Create account</Link>
            <Link href="/forgot-password" className="underline">Forgot password?</Link>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            Client? <Link href="/portal/login" className="underline">Open the client portal</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
