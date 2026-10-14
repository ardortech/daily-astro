// Paper-cut 生肖 images in public/zodiac/, indexed by 地支 (子=0 rat … 亥=11 pig).
const NAMES = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];

// The 256 png is enough up to 64 CSS px (2× and 3× screens); larger sizes get the 512 webp.
export function zodiacImg(branch, size) {
  const n = `${String(branch + 1).padStart(2, '0')}-${NAMES[branch]}`;
  return size <= 64 ? `/zodiac/${n}-256.png` : `/zodiac/${n}-512.webp`;
}
