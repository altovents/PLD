import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#1e3a5f",
          600: "#1a3352",
          700: "#162c45",
          900: "#0f1f30",
        },
        accent: {
          500: "#e85d04",
          600: "#dc4e00",
        },
      },
    },
  },
  plugins: [],
};
export default config;
