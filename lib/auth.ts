// lib/auth.ts


import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserService } from "@/lib/services/userService";
import { UserRole } from "@/types/global";


export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Identifiants manquants");
          return null;
        }

        try {
          // Vérifier l'utilisateur avec le service JSON
          const user = await UserService.verifyPassword(
            credentials.email,
            credentials.password
          );

          if (!user) {
            console.log("Authentification échouée pour :", credentials.email);
            return null;
          }

          // Vérifier que l'utilisateur est actif
          if (!user.isActive) {
            console.log("Compte désactivé pour :", credentials.email);
            return null;
          }

          console.log("Authentification réussie pour :", user.email);
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole, // Assurer le type correct
            associatedClasses: user.associatedClasses,
            customClasses: user.customClasses,
            siteConfig: user.siteConfig
          };
        } catch (error) {
          console.error("Erreur lors de l'authentification :", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours par défaut
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role as UserRole; // Assurer le type correct
        token.name = user.name;
        token.email = user.email;
        token.associatedClasses = user.associatedClasses;
        token.customClasses = user.customClasses;
        token.siteConfig = user.siteConfig;
      }

      // Permettre la mise à jour du token lors de la mise à jour de la session
      if (trigger === "update" && session) {
        return { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as UserRole; // Assurer le type correct ici (ligne 83)
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.associatedClasses = token.associatedClasses as string[] | undefined;
        session.user.customClasses = token.customClasses as string[] | undefined;
        session.user.siteConfig = token.siteConfig;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin"
  },
  secret: process.env.NEXTAUTH_SECRET,
};