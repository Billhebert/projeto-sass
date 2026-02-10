/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fff9e5",
          100: "#ffebb3",
          200: "#ffdd80",
          300: "#ffcf4d",
          400: "#ffc11a",
          500: "#ffe600",
          600: "#e6cf00",
          700: "#ccb800",
          800: "#b3a100",
          900: "#998a00",
        },
      },
      spacing: {
        sidebar: "260px",
        "sidebar-collapsed": "72px",
        header: "64px",
      },
      zIndex: {
        dropdown: "1000",
        sticky: "1020",
        fixed: "1030",
        "modal-backdrop": "1040",
        modal: "1050",
        popover: "1060",
        tooltip: "1070",
        toast: "1080",
      },
    },
  },
  plugins: [],
};
