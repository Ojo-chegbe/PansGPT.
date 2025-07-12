"use client";
import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { getDeviceId } from "../../lib/device-id";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clientDeviceId, setClientDeviceId] = useState<string | null>(null);

  useEffect(() => {
    // Use the robust device ID utility
    const deviceId = getDeviceId();
    setClientDeviceId(deviceId);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let hasError = false;
    setError("");
    setEmailError(false);
    setPasswordError(false);
    
    // Basic validation
    if (!email) {
      setEmailError(true);
      setError("Email is required.");
      hasError = true;
    }
    if (!password) {
      setPasswordError(true);
      setError("Password is required.");
      hasError = true;
    }
    if (hasError) return;

    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        clientDeviceId,
        userAgent: navigator.userAgent,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("Maximum number of devices reached")) {
          setError("You have reached the maximum number of devices for this account. Please log out from another device before logging in.");
        } else {
          setError("Invalid email or password.");
          setEmailError(true);
          setPasswordError(true);
        }
        return;
      }

      // Successful login
      window.location.href = "/main";
    } catch (error) {
      setError("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md p-4 md:p-8 rounded-lg bg-white">
        <h1 className="text-2xl md:text-3xl font-semibold mb-6 md:mb-8 text-center">Welcome back</h1>
        <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-600 text-center font-medium mb-2 text-sm md:text-base">{error}</div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-green-600 mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`appearance-none block w-full px-3 md:px-4 py-2.5 md:py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm md:text-base ${emailError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-green-400'}`}
            />
            {emailError && <div className="text-red-500 text-xs md:text-sm mt-1">Please enter a valid email address.</div>}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-green-600 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`appearance-none block w-full px-3 md:px-4 py-2.5 md:py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm md:text-base ${passwordError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-green-400'}`}
            />
            <div className="flex items-center mt-2">
              <input
                id="showPassword"
                type="checkbox"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
                className="mr-2"
              />
              <label htmlFor="showPassword" className="text-xs md:text-sm text-gray-600 select-none">
                Show password
              </label>
            </div>
            {passwordError && <div className="text-red-500 text-xs md:text-sm mt-1">Please enter your password.</div>}
            <div className="text-right mt-2">
              <Link href="/forgot-password" className="text-green-500 hover:underline text-xs md:text-sm">Forgot password?</Link>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 md:py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md transition-colors text-sm md:text-base"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Continue"}
          </button>
        </form>
        <div className="text-center mt-4 text-xs md:text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/signup" className="text-green-500 hover:underline font-medium">Sign up</Link>
        </div>
        
        {/* Removed the OR divider and Google button */}
      </div>
    </div>
  );
} 