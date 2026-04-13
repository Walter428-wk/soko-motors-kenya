/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/lib/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        sand: "#f6efe4",
        ember: "#f97316",
        moss: "#0f766e",
        slate: "#475569",
        cloud: "#fffaf4"
      },
      boxShadow: {
        card: "0 24px 60px rgba(20, 33, 61, 0.08)",
        soft: "0 18px 40px rgba(15, 118, 110, 0.12)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};
