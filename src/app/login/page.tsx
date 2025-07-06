"use client";
import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { v4 as uuidv4 } from 'uuid';

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
    let id = localStorage.getItem('clientDeviceId');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('clientDeviceId', id);
    }
    setClientDeviceId(id);
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
      setError("Invalid email or password.");
        setEmailError(true);
        setPasswordError(true);
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
      </div>
    </div>
  );
} 