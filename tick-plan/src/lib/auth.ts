import bcrypt from "bcryptjs";
import { getServerSession, NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "./prisma";



export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt"
    },
    pages: {
        signIn: "/login"
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
        Credentials({
            name: "Email",
            credentials: { email: {}, password: {} },
            async authorize(credentials) {
                const email = credentials?.email?.trim().toLowerCase();
                const password = credentials?.password;
                if (!email || !password) return null;

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user?.password) return null;

                const valid = await bcrypt.compare(password, user.password);
                return valid ? { id: user.id, email: user.email, name: user.name } : null;
            },
        })
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                if (!user.email) return false;
                const email = user.email.toLowerCase();
                await prisma.user.upsert({
                    where: { email },
                    update: {},
                    create: { email, name: user.name },
                });
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user?.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email.toLowerCase() },
                });
                if (dbUser) {
                    token.uid = dbUser.id;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.uid) session.user.id = token.uid;
            return session;
        },
    }

}

export const getSession = () => getServerSession(authOptions);