import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";
import daisyui from "daisyui";
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {},
  plugins: [forms, daisyui, typography],
  daisyui: {
    themes: ["emerald"]
  }
};
export default config;
