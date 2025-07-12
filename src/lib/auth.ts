import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Prisma } from "@prisma/client";
import { isValidDeviceId } from "./device-id";

// Define interface for UserDevice
interface UserDevice {
  id: string;
  userId: string;
  deviceId: string;
  firstUsed: Date;
  lastUsed: Date;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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

          // --- DEVICE LIMIT ENFORCEMENT ---
          const clientDeviceId = credentials.clientDeviceId;
          if (!clientDeviceId) {
            throw new Error("Missing client device ID");
          }

          // Validate device ID format
          if (!isValidDeviceId(clientDeviceId)) {
            throw new Error("Invalid device ID format");
          }

          // Check UserDevice table for all device IDs ever used
          const userDevices = await (prisma as any).userDevice.findMany({
            where: { userId: user.id },
            orderBy: { firstUsed: "asc" },
          }) as UserDevice[];

          // If two device IDs exist and this one is not among them, block login
          if (
            userDevices.length >= 2 &&
            !userDevices.some((d: UserDevice) => d.deviceId === clientDeviceId)
          ) {
            throw new Error(
              "Maximum number of devices reached for this account. Please log out from another device before logging in."
            );
          }

          // Upsert device ID into UserDevice table
          await (prisma as any).userDevice.upsert({
            where: {
              userId_deviceId: {
                userId: user.id,
                deviceId: clientDeviceId,
              },
            },
            update: { lastUsed: new Date() },
            create: {
              userId: user.id,
              deviceId: clientDeviceId,
              firstUsed: new Date(),
              lastUsed: new Date(),
            },
          });

          const userAgent =
            (req && req.headers && req.headers["user-agent"] as string) || credentials.userAgent;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            clientDeviceId: clientDeviceId,
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
    async signIn({ }) {
      // Removed manual prisma.account.upsert for Google provider
      return true;
    },
    async session({ session, token }) {
      // If token has an error (user not found), return empty session
      if (token.error) {
        console.log('Session invalidated due to token error:', token.error);
        return {
          user: {} as any,
          expires: new Date(0).toISOString()
        };
      }

      if (session.user) {
        session.user.id = token.sub!;
        session.user.clientDeviceId = token.clientDeviceId as string;
        session.user.userAgent = token.userAgent as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        // Initial sign in - set user data in token
        token.sub = user.id;
        token.clientDeviceId = user.clientDeviceId;
        token.userAgent = user.userAgent;
        return token;
      }

      // On subsequent calls, validate that the user still exists in the database
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { id: true, email: true, name: true }
          });

          if (!dbUser) {
            // User no longer exists in database - invalidate token
            console.log('User no longer exists in database, invalidating token:', token.sub);
            return { ...token, error: "User not found" };
          }

          // User exists, update token with current data
          token.email = dbUser.email;
          token.name = dbUser.name;
        } catch (error) {
          console.error('Error validating user in JWT callback:', error);
          // On database error, allow the token to continue (fail gracefully)
          return token;
        }
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
        } else if ((message as any).session) {
          // Only update if message.session exists
           await prisma.session.update({
            where: { sessionToken: (message as any).session.sessionToken },
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