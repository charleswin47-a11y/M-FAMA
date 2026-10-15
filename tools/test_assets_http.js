const http = require("http");

const urls = [
  "http://localhost:3000/assets/art/characters/portraits/char_veneno_portrait.png",
  "http://localhost:3000/assets/art/characters/portraits/char_calibre_portrait.png",
  "http://localhost:3000/assets/art/characters/portraits/char_trampa_portrait.png",
  "http://localhost:3000/assets/art/characters/portraits/char_pixel_portrait.png",
  "http://localhost:3000/assets/art/cards/card_back_main.png",
  "http://localhost:3000/assets/art/table/table_top.png",
  "http://localhost:3000/assets/art/backgrounds/bg_last_chip_main.jpg",
  "http://localhost:3000/assets/art/cards/faces/2_clubs.png"
];

let pending = urls.length;
urls.forEach(u => {
  http.get(u, res => {
    console.log(`${res.statusCode} ${res.headers["content-type"]} - ${u}`);
    if (--pending === 0) process.exit(0);
  }).on("error", err => {
    console.error(`ERR: ${u}`, err.message);
    if (--pending === 0) process.exit(1);
  });
});
