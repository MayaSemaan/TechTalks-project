/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1E3A8A", // deep blue
        secondary: "#3B82F6", // bright blue
        accent: "#60A5FA", // lighter blue
      },
    },
  },
  plugins: [],
};
