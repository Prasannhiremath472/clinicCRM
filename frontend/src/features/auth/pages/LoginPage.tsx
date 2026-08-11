import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { Activity, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginFormValues } from "@/features/auth/auth.schemas";
import { useLogin } from "@/features/auth/useAuth";
import type { ApiErrorResponse } from "@/types/api.types";

interface LocationState {
  from?: { pathname: string };
}

const FEATURES = [
  { title: "Patient Management", desc: "Complete patient records with medical history" },
  { title: "Smart Scheduling", desc: "Conflict-free appointment booking with availability" },
  { title: "EMR & Prescriptions", desc: "Digital consultations with PDF prescription export" },
  { title: "Revenue Analytics", desc: "Real-time billing, payments and financial reports" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginFormValues) => {
    setServerError(null);
    login.mutate(values, {
      onSuccess: () => {
        toast.success("Welcome back!");
        const state = location.state as LocationState | null;
        const destination = state?.from?.pathname ?? "/dashboard";
        navigate(destination, { replace: true });
      },
      onError: (error) => {
        const message =
          error instanceof AxiosError
            ? (error.response?.data as ApiErrorResponse | undefined)?.message
            : undefined;
        const text = message ?? "Invalid email or password.";
        setServerError(text);
        toast.error(text);
      },
    });
  };

  return (
    <div className="flex min-h-screen">
      {/* Left — brand panel */}
      <div className="relative hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col justify-between overflow-hidden bg-[hsl(222,47%,11%)] p-10">
        {/* Background pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
              radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -left-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-white leading-none">Clinic CRM</p>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mt-0.5">Healthcare Suite</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative space-y-5">
          <h1 className="text-3xl font-bold leading-snug text-white">
            Modern clinic management<br />
            <span className="text-primary">built for India.</span>
          </h1>
          <p className="text-sm text-white/55 leading-relaxed max-w-xs">
            Streamline patient care, appointments, billing, and follow-ups — all in one secure platform.
          </p>

          {/* Feature list */}
          <ul className="space-y-3 pt-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white/80">{f.title}</p>
                  <p className="text-xs text-white/40 mt-0.5">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer text */}
        <p className="relative text-xs text-white/25">
          &copy; {new Date().getFullYear()} Clinic CRM. Secure &amp; HIPAA-aligned.
        </p>
      </div>

      {/* Right — form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold">Clinic CRM</span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Sign in to your account
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to continue
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {serverError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm text-destructive"
                >
                  <span className="mt-px">⚠</span>
                  <span>{serverError}</span>
                </div>
              ) : null}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@clinic.com"
                          className="pl-9 h-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          className="pl-9 pr-9 h-10"
                          {...field}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-10 font-semibold shadow-sm"
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Signing in...</>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </Form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">New to Clinic CRM?</span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/register" className="font-medium text-primary hover:underline">
              Register your clinic
            </Link>
            {" "}to get started
          </p>
        </div>
      </div>
    </div>
  );
}
