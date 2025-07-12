"use client";
import React, { useState } from "react";
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);
    setError("");
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (!error) {
        setStatus("success");
      } else {
        setError(error.message || "Failed to send reset email.");
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
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center text-green-600">Forgot Password?</h1>
        <p className="text-gray-600 text-center mb-6">Enter your email and we'll send you a link to reset your password.</p>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-green-700 mb-1">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="appearance-none block w-full px-4 py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-base border-green-300"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md transition-colors text-base"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        {status === "success" && (
          <div className="text-green-600 text-center mt-4 font-medium">If an account exists for that email, a reset link has been sent.</div>
        )}
        {status === "error" && (
          <div className="text-red-600 text-center mt-4 font-medium">{error}</div>
        )}
      </div>
    </div>
  );
} 