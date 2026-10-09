"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth";
import { ApiError, fieldErrors } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { AuthShell } from "@/components/auth-shell";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function PortalLoginPage() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  async function onSubmit(values: z.infer<typeof schema>) {
    setServerError("");
    try {
      await login(values.email, values.password);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Login failed");
      void fieldErrors;
    }
  }

  return (
    <AuthShell title="Client Portal" description="Review scopes, answer requests, track progress.">
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          <FieldError message={form.formState.errors.email?.message} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...form.register("password")} />
          <FieldError message={form.formState.errors.password?.message} />
        </div>
        {serverError && <p className="text-sm font-medium text-red-600">{serverError}</p>}
        <Button type="submit" size="pill" disabled={form.formState.isSubmitting}>Log in to portal</Button>
      </form>
    </AuthShell>
  );
}
