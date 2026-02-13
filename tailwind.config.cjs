/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        parchment: "#F3EBD8",
        ink: "#1F1B16",
        soot: "#5E554A",
        cinnabar: "#A63A2E",
        bronze: "#9B7B3D",
        flax: "#E7DCC5"
      },
      fontFamily: {
        serifCn: ['"Noto Serif SC"', '"Songti SC"', '"STSong"', "serif"],
        sansCn: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "sans-serif"]
      },
      boxShadow: {
        "panel-soft": "0 10px 24px rgba(31, 27, 22, 0.15)"
      }
    }
  },
  plugins: []
};

