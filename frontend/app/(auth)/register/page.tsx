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
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

export default function RegisterPage() {
  const { register } = useAuth();
  const [serverError, setServerError] = useState("");
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  async function onSubmit(values: z.infer<typeof schema>) {
    setServerError("");
    const params = new URLSearchParams(window.location.search);
    try {
      await register(values.name, values.email, values.password, params.get("inviteToken") ?? undefined);
      toast.success("Account created");
    } catch (e) {
      if (e instanceof ApiError) {
        const fe = fieldErrors(e);
        for (const [k, m] of Object.entries(fe)) form.setError(k as "name" | "email" | "password", { message: m });
        setServerError(e.message);
      } else setServerError("Registration failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start managing scopes without the creep.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoComplete="name" {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              <FieldError message={form.formState.errors.email?.message} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
              <FieldError message={form.formState.errors.password?.message} />
            </div>
            {serverError && <p className="text-sm text-red-600">{serverError}</p>}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating…" : "Create account"}
            </Button>
          </form>
          <p className="mt-3 text-sm">
            Have an account? <Link href="/login" className="underline">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
