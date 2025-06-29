// app/components/HomeClient.js
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect } from "react";
import LoginButton from "./LoginButton";

export default function HomeClient() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session) {
      console.log("session data", session);
    }
  }, [session]);

  if (status === "loading") return <p> Loading ...</p>;
  if (!session) {
    return (
      <div>
        {/* <button onClick={() => signIn("google")}>Continue with Google</button> */}
        <LoginButton />
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome {session.user.name}</h1>
      <p>Email: {session.user.email}</p>
      <img src={session.user.image} alt="Profile" width={50} />
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
