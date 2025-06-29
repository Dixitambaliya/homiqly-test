// nextjs-frontend/app/api/auth/[...nextauth]/route.js

import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import NextAuth from "next-auth";
import axios from "axios";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    CredentialsProvider({
      name: "Credentials",
      async authorize(credentials) {
        try {
          const res = await axios.post(
            `${process.env.BACKEND_URL}/api/user/login`,
            {
              email: credentials.email,
              password: credentials.password,
            }
          );

          if (res.data) {
            return {
              id: res.data.id,
              email: res.data.email,
              name: res.data.name,
              ...res.data,
            };
          }
          return null;
        } catch (err) {
          console.error("Authorize error:", err);
          throw new Error(err.response?.data?.message || "Invalid credentials");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = user;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = token.user;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export default handler;
