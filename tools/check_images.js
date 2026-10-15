const fs = require("fs");
const path = require("path");

function getJpgSize(filePath) {
  const buf = fs.readFileSync(filePath);
  let i = 2;
  while (i < buf.length - 8) {
    if (buf[i] === 0xFF && (buf[i+1] === 0xC0 || buf[i+1] === 0xC2)) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return { width, height };
    }
    if (buf[i] === 0xFF && buf[i+1] !== 0x00 && buf[i+1] !== 0xFF) {
      const len = buf.readUInt16BE(i + 2);
      i += 2 + len;
    } else {
      i++;
    }
  }
  return null;
}

const dir = "assets/art/raw";
fs.readdirSync(dir).forEach(f => {
  if (f.endsWith(".jpg")) {
    console.log(f, getJpgSize(path.join(dir, f)));
  }
});
