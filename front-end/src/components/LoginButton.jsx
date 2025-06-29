"use client";

import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";
import { useState } from "react";

export default function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/dashboard",
      });
    } catch (error) {
      console.error("Google login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 border px-4 py-2 rounded-md shadow hover:bg-gray-500 w-full disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FcGoogle size={20} />
      <span>{isLoading ? "Loading..." : "Continue with Google"}</span>
    </button>
  );
}
