
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        aeza: {
          primary: "#1E88E5",
          surface: "#F5F7FB",
          text: "#0F172A"
        }
      },
          borderRadius: {
        xl2: "1rem",
        xl3: "1.25rem"
      }
    },
  },
  plugins: [],
}
