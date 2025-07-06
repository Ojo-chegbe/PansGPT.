import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image?: string | null;
      clientDeviceId?: string;
      userAgent?: string;
    }
  }
  
  interface User {
    id: string;
    email: string;
    name: string | null;
    image?: string | null;
    clientDeviceId?: string;
    userAgent?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string | null;
    image?: string | null;
    clientDeviceId?: string;
    userAgent?: string;
  }
} 