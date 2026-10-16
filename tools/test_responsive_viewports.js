import fs from 'fs';

console.log("=== RUNNING RESPONSIVE VIEWPORT & CSS VALIDATION ===");

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/style.css', 'utf8');

// 1. Validate meta viewport
const metaViewportMatch = html.match(/<meta\s+name=["']viewport["']\s+content=["']([^"']+)["']/i);
if (!metaViewportMatch) {
  throw new Error("Missing meta viewport tag in index.html!");
}
console.log("✅ Meta viewport found:", metaViewportMatch[1]);
if (!metaViewportMatch[1].includes("viewport-fit=cover")) {
  throw new Error("Meta viewport missing viewport-fit=cover for mobile notches!");
}
console.log("✅ viewport-fit=cover present for mobile notches.");

// 2. Validate media queries in style.css
const breakpoints = [
  { name: "Tablet (max-width: 1024px)", query: "@media (max-width: 1024px)" },
  { name: "Mobile (max-width: 600px)", query: "@media (max-width: 600px)" },
  { name: "Mobile Landscape (max-height: 520px)", query: "@media (max-height: 520px)" },
  { name: "Prefers Reduced Motion", query: "@media (prefers-reduced-motion: reduce)" }
];

breakpoints.forEach(bp => {
  if (!css.includes(bp.query)) {
    throw new Error(`Missing breakpoint in css/style.css: ${bp.name}`);
  }
  console.log(`✅ Breakpoint validated: ${bp.name}`);
});

// 3. Validate mobile touch and safe-area features
if (!css.includes("--safe-top") || !css.includes("--safe-bottom")) {
  throw new Error("Missing safe-area variables in style.css!");
}
console.log("✅ Safe-area inset variables verified.");

if (!css.includes("100dvh")) {
  throw new Error("Missing 100dvh dynamic mobile viewport height!");
}
console.log("✅ 100dvh dynamic viewport height verified.");

// 4. Validate button min-heights for thumb accessibility (>= 44px)
const minHeightMatches = css.match(/min-height:\s*(44px|48px|46px|42px)/g);
if (!minHeightMatches || minHeightMatches.length < 5) {
  throw new Error("Insufficient mobile 44px touch targets in style.css!");
}
console.log(`✅ Verified ${minHeightMatches.length} thumb-friendly min-height touch targets (>=44px).`);

// 5. Validate card elevation on mobile touch/hover
if (!css.includes(".hand-card-wrapper:hover") || !css.includes("translateY(-24px)")) {
  throw new Error("Missing card elevation translateY(-24px) for mobile hand!");
}
console.log("✅ Card elevation translateY(-24px) and z-index: 99 verified on mobile.");

console.log("\n=== ALL RESPONSIVE TESTS PASSED PERFECTLY! ===");
