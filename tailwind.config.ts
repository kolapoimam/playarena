import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Satoshi", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: {
          DEFAULT: "hsl(var(--background))",
          light: "#F3F2F8",
          dark: "#000000",
        },
        foreground: {
          DEFAULT: "hsl(var(--foreground))",
          light: "#000000",
          dark: "#FFFFFF",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          light: "#1DB954",
          dark: "#51DC80",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          light: "#FAE9A3",
          dark: "#FAE9A3",
          text: "#E51515",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        input: {
          DEFAULT: "hsl(var(--input))",
          light: "#FFFFFF",
          dark: "#1C1C1E",
        },
        // SportCliq light redesign tokens
        sc: {
          bg: "#F4F5F1",
          card: "#FFFFFF",
          soft: "#EEF0EB",
          soft2: "#E6E9E3",
          line: "#E3E6E0",
          ink: "#0E1411",
          ink2: "#4A524D",
          ink3: "#646C67",
          green: "#22C55E",
          "green-dark": "#15803D",
          "green-ink": "#052E16",
          "green-bg": "#DCFCE7",
        },
        sport: {
          "football-bg": "#DCFCE7", "football-fg": "#15803D", football: "#22C55E",
          "cycling-bg": "#FFEDD5", "cycling-fg": "#C2410C", cycling: "#FB923C",
          "venue-bg": "#EDE9FE", "venue-fg": "#6D28D9", venue: "#8B5CF6",
          "tennis-bg": "#FEF9C3", "tennis-fg": "#854D0E", tennis: "#FACC15",
          "guide-bg": "#DBEAFE", "guide-fg": "#1D4ED8", guide: "#3B82F6",
          "money-bg": "#CCFBF1", "money-fg": "#0F766E", money: "#14B8A6",
          "red-bg": "#FEE2E2", "red-fg": "#B91C1C", red: "#EF4444",
          "pink-bg": "#FCE7F3", "pink-fg": "#BE185D", pink: "#EC4899",
        },
        playarena: {
          50: "#e6f9ed",
          100: "#b3edd0",
          200: "#80e1b2",
          300: "#4dd594",
          400: "#26c876",
          500: "#18a34a",
          600: "#138a3e",
          700: "#0e7132",
          800: "#095826",
          900: "#053f1a",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,20,17,0.04)",
        nav: "0 12px 32px rgba(14,20,17,0.14), 0 2px 6px rgba(14,20,17,0.06)",
        float: "0 12px 32px rgba(14,20,17,0.10)",
      },
      borderRadius: {
        "4xl": "2rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
