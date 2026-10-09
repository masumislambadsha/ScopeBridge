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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Links expire after 1 hour and work once.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
            <div>
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
              <FieldError message={form.formState.errors.password?.message} />
            </div>
            {serverError && <p className="text-sm text-red-600">{serverError}</p>}
            <Button type="submit" disabled={form.formState.isSubmitting}>Reset password</Button>
          </form>
          <p className="mt-3 text-sm"><Link href="/login" className="underline">Back to login</Link></p>
        </CardContent>
      </Card>
    </main>
  );
}
