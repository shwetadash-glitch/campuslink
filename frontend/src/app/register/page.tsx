"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/forms/FormField";
import { FormError } from "@/components/forms/FormError";
import { parseApiError } from "@/services/apiClient";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "RECRUITER">("STUDENT");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Enter a valid email address.";
    }

    if (!password) {
      errs.password = "Password is required.";
    } else if (password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    return errs;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setFormError("");
    setFieldErrors({});

    try {
      const { apiClient } = await import("@/services/apiClient");
      await apiClient.post("/api/v1/auth/register", {
        email: email.trim(),
        password,
        role,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setFormError(err?.message || "Network error: Unable to reach server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-campusblue-50 bg-gradient-to-br from-campusblue-50 to-campusblue-50 p-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-campusblue-100">
        <div className="text-center mb-6">
          <span className="text-2xl font-black tracking-tight text-campusblue-700">
            CAMPUS<span className="text-campusblue-900">LINK</span>
          </span>
          <h2 className="text-xl font-bold mt-2 text-campusblue-900">Create an Account</h2>
          <p className="text-xs text-campusblue-500 mt-0.5">
            Join the campus placement and recruitment ecosystem
          </p>
        </div>

        {success ? (
          <div className="p-4 bg-campusblue-50 border border-campusblue-100 text-campusblue-900 rounded-xl text-center space-y-2">
            <h4 className="font-bold text-sm">Registration Successful!</h4>
            <p className="text-xs">Your account has been created. Redirecting to login...</p>
            <Link
              href="/login"
              className="inline-block text-xs font-semibold text-campusblue-800 underline mt-2"
            >
              Click here to sign in immediately &rarr;
            </Link>
          </div>
        ) : (
          <>
            <FormError error={formError} className="mb-4" onDismiss={() => setFormError("")} />

            <form onSubmit={handleRegister} className="space-y-4">
              <FormField label="Select Role" required>
                <Select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                >
                  <option value="STUDENT">Student (Job seeker / Student profile)</option>
                  <option value="RECRUITER">Recruiter (Hiring company representative)</option>
                </Select>
              </FormField>

              <FormField label="Email Address" required error={fieldErrors.email}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
                  }}
                  hasError={Boolean(fieldErrors.email)}
                  placeholder="name@example.com"
                  required
                />
              </FormField>

              <FormField label="Password" required error={fieldErrors.password} helperText="At least 6 characters">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
                  }}
                  hasError={Boolean(fieldErrors.password)}
                  placeholder="••••••••"
                  required
                />
              </FormField>

              <FormField label="Confirm Password" required error={fieldErrors.confirmPassword}>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: "" });
                  }}
                  hasError={Boolean(fieldErrors.confirmPassword)}
                  placeholder="••••••••"
                  required
                />
              </FormField>

              <Button type="submit" loading={loading} className="w-full py-2.5 mt-2">
                Register Account
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-campusblue-50 text-center text-xs text-campusblue-500">
              <span>Already have an account? </span>
              <Link href="/login" className="font-semibold text-campusblue-700 hover:underline">
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}






