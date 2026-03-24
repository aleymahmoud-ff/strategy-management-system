import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        login: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) return null;

        const login = (credentials.login as string).trim();
        const isEmail = login.includes("@");

        const user = await prisma.user.findFirst({
          where: isEmail
            ? { email: login }
            : { username: login },
          include: {
            assignments: {
              select: { divisionId: true, permission: true },
            },
          },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          divisionId: user.divisionId,
          assignments: user.assignments.map((a) => ({
            divisionId: a.divisionId,
            permission: a.permission,
          })),
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as string;
        token.image = (user.image as string | null) ?? null;
        token.divisionId = user.divisionId as string | null;
        token.assignments = user.assignments as { divisionId: string; permission: string }[];
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "FUNCTION_HEAD" | "STRATEGY_MANAGER" | "EXECUTIVE";
      session.user.image = (token.image as string | null) ?? null;
      session.user.divisionId = (token.divisionId as string | null) ?? null;
      session.user.assignments = (token.assignments as { divisionId: string; permission: "EDIT" | "VIEW_ONLY" }[]) || [];
      return session;
    },
  },
});
