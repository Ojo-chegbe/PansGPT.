"use client";
import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { getDeviceId } from "../../lib/device-id";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [level, setLevel] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [clientDeviceId, setClientDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const deviceId = getDeviceId();
    setClientDeviceId(deviceId);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let valid = true;
    setError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    // Validation
    if (!email) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }
    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    }
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password.");
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      valid = false;
    }
    if (!valid) return;

    // Ensure clientDeviceId is available
    let deviceId = clientDeviceId;
    if (!deviceId) {
      deviceId = getDeviceId();
      setClientDeviceId(deviceId);
    }

    setIsLoading(true);
    try {
      // Create user
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: fullName,
          level,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        // Show backend error if available, otherwise generic
        setError(data.error || data.message || "Something went wrong");
        setIsLoading(false);
        return;
      }

      // Sign in the user
      const result = await signIn("credentials", {
        email,
        password,
        clientDeviceId: deviceId,
        userAgent: navigator.userAgent,
        redirect: false,
      });

      console.log("SignIn result:", result);

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Use window.location for a full page navigation
      window.location.href = "/main";
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md p-4 md:p-8 rounded-lg bg-white">
        <h1 className="text-2xl md:text-3xl font-semibold mb-6 md:mb-8 text-center">Sign Up</h1>
        <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-600 text-center font-medium mb-2 text-sm md:text-base">{error}</div>
          )}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="appearance-none block w-full px-3 md:px-4 py-2.5 md:py-3 border border-green-400 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm md:text-base"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
            {emailError && <div className="text-red-500 text-xs md:text-sm mt-1">{emailError}</div>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`appearance-none block w-full px-3 md:px-4 py-2.5 md:py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm md:text-base ${passwordError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-green-400'}`}
            />
            {passwordError && <div className="text-red-500 text-xs md:text-sm mt-1">{passwordError}</div>}
          </div>
          <div className="flex items-center mt-2 mb-2">
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
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={`appearance-none block w-full px-3 md:px-4 py-2.5 md:py-3 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm md:text-base ${confirmPasswordError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-green-400'}`}
            />
            {confirmPasswordError && <div className="text-red-500 text-xs md:text-sm mt-1">{confirmPasswordError}</div>}
          </div>
          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
              Level
            </label>
            <select
              id="level"
              name="level"
              required
              value={level}
              onChange={e => setLevel(e.target.value)}
              className="block w-full px-3 md:px-4 py-2.5 md:py-3 border border-green-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 text-sm md:text-base"
            >
              <option value="">Select level</option>
              <option value="100">100 level</option>
              <option value="200">200 level</option>
              <option value="300">300 level</option>
              <option value="400">400 level</option>
              <option value="500">500 level</option>
              <option value="600">600 level</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 md:py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md transition-colors text-sm md:text-base"
            disabled={isLoading}
          >
            {isLoading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>
        <div className="text-center mt-4 text-xs md:text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-green-500 hover:underline font-medium">Login</Link>
        </div>
      </div>
    </div>
  );
} 