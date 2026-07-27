/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0F172A", // sidebar / nav / dark surfaces
          700: "#1E293B",
          500: "#475569",
        },
        canvas: "#FAFAF8", // warm off-white page background
        brand: {
          DEFAULT: "#0D9488", // primary accent (teal) -- not default indigo
          dark: "#0F766E",
          light: "#CCFBF1",
        },
        warn: {
          DEFAULT: "#D97706", // pending / amber
          light: "#FEF3C7",
        },
        danger: {
          DEFAULT: "#DC2626", // overdue / errors only
          light: "#FEE2E2",
        },
        success: {
          DEFAULT: "#15803D",
          light: "#DCFCE7",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(4px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.15s ease-out",
        scaleIn: "scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        slideDown: "slideDown 0.15s ease-out",
      },
    },
  },
  plugins: [],
};
