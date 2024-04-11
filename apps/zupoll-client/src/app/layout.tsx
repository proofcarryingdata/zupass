import { ThemeProvider } from "next-themes";
import { Inter as FontSans } from "next/font/google";
import { GlobalStyle } from "../@/lib/GlobalStyle";
import StyledComponentsRegistry from "../@/lib/StyledComponentsRegistry";
import { cn } from "../@/lib/utils";
import "../globals.css";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata = {
  title: "Zupoll",
  description: "Anonymous Voting Powered by Zupass"
};

const DEFAULT_THEME: "light" | "dark" = "light";

export default function RootLayout({
  children
}: {
  children: React.ReactNode | React.ReactNode[];
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme={DEFAULT_THEME}
          enableSystem
          disableTransitionOnChange
        >
          <StyledComponentsRegistry>
            <GlobalStyle />
            {children}
            <script
              async
              defer
              src="https://scripts.simpleanalyticscdn.com/latest.js"
            ></script>
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://queue.simpleanalyticscdn.com/noscript.gif"
                alt=""
                referrerPolicy="no-referrer-when-downgrade"
              />
            </noscript>
          </StyledComponentsRegistry>
        </ThemeProvider>
      </body>
    </html>
  );
}
