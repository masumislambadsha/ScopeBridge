"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";

const schema = z.object({ email: z.string().email("Enter a valid email") });

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  async function onSubmit(values: z.infer<typeof schema>) {
    await api.post("/api/auth/forgot-password", values);
    setDone(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>We email you a reset link if the account exists.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-sm">If an account exists for that email, a reset link is on its way. <Link href="/login" className="underline">Back to login</Link></p>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} />
                <FieldError message={form.formState.errors.email?.message} />
              </div>
              <Button type="submit" disabled={form.formState.isSubmitting}>Send reset link</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
