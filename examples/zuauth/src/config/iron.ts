export interface SessionData {
  watermark?: string;
  user?: Record<string, any>;
}

export const ironOptions = {
  cookieName: "zuauth_example",
  password:
    "set from environment variable in production, do not include in source code esp. for public repository etc. etc.",
  // secure: true should be used in production (HTTPS) but can't be used in development (HTTP)
  cookieOptions: {
    secure: process.env.NODE_ENV === "production"
  }
};
