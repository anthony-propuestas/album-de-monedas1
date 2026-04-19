import { Authenticator } from "remix-auth";
import { GoogleStrategy } from "remix-auth-google";
import { createCookieSessionStorage } from "@remix-run/cloudflare";
import type { Env } from "~/types/env";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  picture: string;
};

export function createAuth(env: Env) {
  const sessionStorage = createCookieSessionStorage<{ user: UserProfile }>({
    cookie: {
      name: "__session",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secrets: [env.SESSION_SECRET],
      secure: process.env.NODE_ENV === "production",
    },
  });

  const authenticator = new Authenticator<UserProfile>(sessionStorage);

  authenticator.use(
    new GoogleStrategy<UserProfile>(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
      },
      async ({ profile }) => ({
        id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0].value,
      })
    )
  );

  return { authenticator, sessionStorage };
}
