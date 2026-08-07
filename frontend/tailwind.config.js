/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Systemic custom variable bindings
        app: "var(--bg-app)",
        surface: {
          DEFAULT: "var(--bg-surface)",
          raised: "var(--bg-surface-raised)",
          overlay: "var(--bg-surface-overlay)",
        },
        border: {
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        brand: {
          DEFAULT: "#7C3AED", // EcoLoop Vibrant Purple
          hover: "#6D28D9",
          light: "#A78BFA",
        },
        ecoloop: {
          purple: "#7C3AED",
          purpleDark: "#6D28D9",
          purpleLight: "#F3E8FF",
          purpleBorder: "#E9D5FF",
          purpleBadge: "#ECE9FE",
        },
        // Colorblind-safe 4-tier risk scale
        risk: {
          clean: "#10b981",    // Emerald
          warning: "#f59e0b",  // Amber
          mismatch: "#f97316", // Orange
          critical: "#ef4444", // Crimson
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        card: "10px",
        chip: "9999px",
      },
      boxShadow: {
        panel: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
        elevated: "0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
      },
      keyframes: {
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.99)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};
