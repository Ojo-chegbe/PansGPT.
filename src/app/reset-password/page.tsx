"use client";
import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError("");
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      setStatus("error");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setStatus("error");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setStatus("success");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to reset password.");
        setStatus("error");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md p-6 md:p-10 rounded-lg bg-white shadow-xl border border-green-100">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-green-600">Reset Password</h1>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-green-700 mb-1">New Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="appearance-none block w-full px-4 py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-base border-green-300"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-green-700 mb-1">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="appearance-none block w-full px-4 py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-base border-green-300"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md transition-colors text-base"
            disabled={isLoading}
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
        {status === "success" && (
          <div className="text-green-600 text-center mt-4 font-medium">Password reset! Redirecting to login...</div>
        )}
        {status === "error" && (
          <div className="text-red-600 text-center mt-4 font-medium">{error}</div>
        )}
      </div>
    </div>
  );
} 