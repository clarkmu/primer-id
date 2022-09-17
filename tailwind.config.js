/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4B9CD3",
        secondary: "#13294B",
        paper: "#26282B",
        black: "#151515",
        grey: "#F8F8F8",
        red: "#96522f",
        green: "#00594C",
        darkgreen: "#C4D600",
      },
    },
  },
  plugins: [],
};
