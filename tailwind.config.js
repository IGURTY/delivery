/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#FACC15", // Amarelo
        dark: "#0A0A0A",    // Preto
        gray: {
          900: "#111111",
          800: "#1A1A1A",
          700: "#2A2A2A",
          600: "#3A3A3A",
        }
      },
    },
  },
  plugins: [],
};