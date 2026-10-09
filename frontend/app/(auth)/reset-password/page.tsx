"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { AuthShell } from "@/components/auth-shell";

const schema = z.object({ password: z.string().min(8, "At least 8 characters") });

export default function ResetPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  async function onSubmit(values: z.infer<typeof schema>) {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    try {
      await api.post("/api/auth/reset-password", { token, password: values.password });
      toast.success("Password reset — please log in");
      router.push("/login");
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Reset failed");
    }
  }

  return (
    <AuthShell
      title="Set a new password"
      description="Links expire after 1 hour and work once."
      footer={
        <Link href="/login" className="font-medium text-sage-600 underline underline-offset-4 hover:text-sage-700">Back to login</Link>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
          <FieldError message={form.formState.errors.password?.message} />
        </div>
        {serverError && <p className="text-sm font-medium text-red-600">{serverError}</p>}
        <Button type="submit" size="pill" disabled={form.formState.isSubmitting}>Reset password</Button>
      </form>
    </AuthShell>
  );
}
