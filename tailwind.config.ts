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
        gold: {
          DEFAULT: "#C99B3C",
          light: "#E8C777",
          dark: "#A67D2E",
        },
        navy: {
          DEFAULT: "#1A1A2E",
          light: "#2A2A4E",
        },
        teal: {
          DEFAULT: "#7EBEC5",
        },
        warm: {
          white: "#F8F5F0",
          cream: "#F0EBE1",
        },
      },
      fontFamily: {
        body: ["var(--font-body)", "Jost", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "Bodoni Moda", "Georgia", "serif"],
        sans: ["var(--font-body)", "Jost", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
