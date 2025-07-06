"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

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
        throw new Error(data.message || "Something went wrong");
      }

      // Sign in the user
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log("SignIn result:", result);

      if (result?.error) {
        throw new Error(result.error);
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
        <div className="flex items-center my-4 md:my-6">
          <div className="flex-grow h-px bg-gray-200" />
          <span className="mx-4 text-gray-400 font-medium text-xs md:text-sm">OR</span>
          <div className="flex-grow h-px bg-gray-200" />
        </div>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/main" })}
          className="w-full flex items-center justify-center gap-2 py-2.5 md:py-3 px-4 border border-gray-300 rounded-md bg-white hover:bg-gray-50 font-semibold text-gray-700 transition-colors text-sm md:text-base"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_17_40)">
              <path d="M47.5 24.5C47.5 22.6 47.3 20.8 47 19H24V29.1H37.4C36.7 32.2 34.7 34.7 31.8 36.4V42H39.5C44 38.1 47.5 32.1 47.5 24.5Z" fill="#4285F4"/>
              <path d="M24 48C30.6 48 36.1 45.9 39.5 42L31.8 36.4C29.9 37.6 27.6 38.3 24 38.3C17.7 38.3 12.2 34.2 10.3 28.7H2.3V34.4C5.7 41.1 14.1 48 24 48Z" fill="#34A853"/>
              <path d="M10.3 28.7C9.7 27.1 9.4 25.4 9.4 23.7C9.4 22 9.7 20.3 10.3 18.7V13H2.3C0.8 16.1 0 19.5 0 23.7C0 27.9 0.8 31.3 2.3 34.4L10.3 28.7Z" fill="#FBBC05"/>
              <path d="M24 9.1C27.9 9.1 30.7 10.7 32.3 12.2L39.6 5C36.1 1.7 30.6 0 24 0C14.1 0 5.7 6.9 2.3 13L10.3 18.7C12.2 13.2 17.7 9.1 24 9.1Z" fill="#EA4335"/>
            </g>
            <defs>
              <clipPath id="clip0_17_40">
                <rect width="48" height="48" fill="white"/>
              </clipPath>
            </defs>
          </svg>
          Continue with Google
        </button>
        <div className="text-center mt-4 text-xs md:text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-green-500 hover:underline font-medium">Login</Link>
        </div>
      </div>
    </div>
  );
} 