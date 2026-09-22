import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
);

export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: `openid email profile ${CALENDAR_SCOPE}`,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.scope = account.scope;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) || "google";
      }
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.refreshToken = typeof token.refreshToken === "string" ? token.refreshToken : undefined;
      session.hasCalendar = typeof token.scope === "string" && token.scope.includes("calendar");
      return session;
    },
  },
});
