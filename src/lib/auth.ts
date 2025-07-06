import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        clientDeviceId: { label: "Client Device ID", type: "text" },
        userAgent: { label: "User Agent", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            console.log("User not found or no password:", credentials.email);
            throw new Error("Invalid credentials");
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.log("Invalid password for user:", credentials.email);
            throw new Error("Invalid credentials");
          }

          const userAgent = req.headers['user-agent'] as string || credentials.userAgent;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            clientDeviceId: credentials.clientDeviceId,
            userAgent: userAgent,
          };
        } catch (err) {
          console.error("Authorize error:", err);
          throw err;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          },
          create: {
            userId: user.id,
            type: "oauth",
            provider: "google",
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            token_type: account.token_type,
            scope: account.scope,
          },
          update: {
            access_token: account.access_token,
            token_type: account.token_type,
            scope: account.scope,
          },
        });
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.clientDeviceId = token.clientDeviceId as string;
        session.user.userAgent = token.userAgent as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.clientDeviceId = user.clientDeviceId;
        token.userAgent = user.userAgent;
      }
      return token;
    },
  },
  events: {
    async signIn(message) {
      if (message.user.id && message.account?.provider === "credentials") {
        const clientDeviceId = message.user.clientDeviceId;
        const userAgent = message.user.userAgent;

        const latestSession = await prisma.session.findFirst({
          where: {
            userId: message.user.id,
            clientDeviceId: clientDeviceId,
          },
          orderBy: { expires: 'desc' },
        });

        if (latestSession) {
          await prisma.session.update({
            where: { id: latestSession.id },
            data: {
              userAgent: userAgent,
            },
          });
        } else if (message.session) {
           await prisma.session.update({
            where: { sessionToken: message.session.sessionToken },
            data: {
              clientDeviceId: clientDeviceId,
              userAgent: userAgent,
            },
          });
        }

        const userSessions = await prisma.session.findMany({
          where: {
            userId: message.user.id,
          },
          orderBy: { expires: 'asc' },
        });

        const maxDevices = 2;
        if (userSessions.length > maxDevices) {
          const sessionsToDelete = userSessions.slice(0, userSessions.length - maxDevices);
          await prisma.session.deleteMany({
            where: {
              id: { in: sessionsToDelete.map(s => s.id) },
            },
          });
        }
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
}; 