"use client";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/main");
    }
    // Do not redirect if unauthenticated
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <Image
        src="/uploads/BAckground.jpg"
        alt="Background"
        fill
        className="z-0 object-cover"
        priority
      />
      {/* Overlay image with transparency */}
      <Image
        src="/uploads/Overlay.jpg"
        alt="Overlay"
        fill
        className="z-10 opacity-90 object-cover"
        priority
      />
      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center px-4">
        <div className="w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 relative mb-4 md:mb-6">
          <Image
            src="/uploads/Logo.png"
            alt="PansGPT Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <p className="text-base md:text-lg lg:text-xl text-white mb-6 md:mb-6 max-w-xl">
          Because every PANSite deserves a friend who understands it all.
        </p>
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full max-w-xs md:max-w-none justify-center">
          <Link href="/signup" passHref className="w-full md:w-auto">
            <button className="w-full bg-white text-black font-semibold px-4 md:px-6 py-2 md:py-2.5 rounded-md text-sm md:text-base hover:bg-gray-200 transition">Get started</button>
          </Link>
          <Link href="/login" passHref className="w-full md:w-auto">
            <button className="w-full border border-white text-white font-semibold px-4 md:px-6 py-2 md:py-2.5 rounded-md text-sm md:text-base hover:bg-white hover:text-black transition">Log in</button>
          </Link>
        </div>
      </div>
    </div>
  );
} 