/** EAN-style bar pattern as an SVG path for a 240x48 viewBox. Digits only. */
export function barcodePath(digits: string): string {
  const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const clean = digits.replace(/\D/g, '');
  const half = Math.floor(clean.length / 2);
  let m = '101';
  [...clean].forEach((ch, i) => { if (i === half) m += '01010'; m += L[+ch]; });
  m += '101';
  const w = 240 / m.length;
  let d = '';
  let i = 0;
  while (i < m.length) {
    if (m[i] === '1') {
      let j = i;
      while (m[j] === '1') j++;
      const width = ((j - i) * w).toFixed(2);
      d += `M${(i * w).toFixed(2)} 0h${width}v48h-${width}z`;
      i = j;
    } else i++;
  }
  return d;
}
