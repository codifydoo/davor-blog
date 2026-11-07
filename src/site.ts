/** Site-wide constants. Edit these to make the blog yours. */
export const SITE = {
  name: 'DAVOR',
  title: 'Davor — personal blog',
  description: 'Notes from building software at Codify in Zagreb: what I built, what broke, and what I would do differently.',
  tagline: 'personal blog · est. 2026',
  terminal: 'TERMINAL 01 · ZAGREB, HR',
  cashier: 'davor',
  langs: 'EN/HR',
  email: 'dsantic@codify.hr',
  /** PGP fingerprint as printed lines; leave empty to hide the row. */
  pgp: [] as string[],
  /** Profile links on the Mail page and as rel="me" in every page's head; leave one empty to hide it. */
  linkedin: 'https://www.linkedin.com/in/davor-s-453aaa1b2/',
  /** X handle without the @. */
  x: '6174_____',
  accent: '#b3261e',
  /** All printed dates use this zone, whatever machine runs the build. */
  timeZone: 'Europe/Zagreb',
  /** The month that gets receipt number receiptBase; later months count up from it. */
  firstMonth: '2026-08',
  receiptBase: 110,
  /** Projects listed on the About receipt. */
  projects: [
    { name: 'aesmsg', qty: 1, note: 'encrypted links for any messenger' },
    { name: 'Sproobo', qty: 1, note: 'self-hosted deployments, runs this blog' },
  ],
};
