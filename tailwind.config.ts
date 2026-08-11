import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        paper: "var(--paper)",
        cream: "var(--cream)",
        matcha: "var(--matcha)",
        "matcha-deep": "var(--matcha-deep)",
        "matcha-light": "var(--matcha-light)",
        "matcha-mist": "var(--matcha-mist)",
        muted: "var(--muted)",
        line: "var(--line)",
        amber: "var(--amber)",
        danger: "var(--danger)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(25, 26, 20, 0.04), 0 8px 24px -12px rgba(25, 26, 20, 0.12)",
        lift: "0 24px 60px -18px rgba(25, 26, 20, 0.28)",
        pop: "0 12px 32px -8px rgba(78, 91, 51, 0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        toastIn: {
          "0%": { opacity: "0", transform: "translateY(14px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        rise: "rise 0.35s ease-out both",
        pulseDot: "pulseDot 2s ease-in-out infinite",
        toastIn: "toastIn 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
