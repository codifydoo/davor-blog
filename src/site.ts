/** Site-wide constants. Edit these to make the blog yours. */
export const SITE = {
  name: 'DAVOR',
  title: 'Davor — personal blog',
  description: 'Infrastructure notes from a small home network in Zagreb. What I set up, what broke, and what I would do differently.',
  tagline: 'personal blog · est. 2026',
  terminal: 'TERMINAL 01 · ZAGREB, HR',
  cashier: 'davor',
  langs: 'EN/HR',
  email: 'dsantic@codify.hr',
  /** PGP fingerprint as printed lines; leave empty to hide the row. */
  pgp: [] as string[],
  accent: '#b3261e',
  /** All printed dates use this zone, whatever machine runs the build. */
  timeZone: 'Europe/Zagreb',
  /** The month that gets receipt number receiptBase; later months count up from it. */
  firstMonth: '2026-08',
  receiptBase: 110,
  /** Devices listed on the About receipt. */
  devices: [
    { name: 'Four-bay NAS', qty: 1, note: 'storage, backups, media' },
    { name: 'Router running OpenWrt', qty: 1, note: 'VLANs, firewall, WireGuard' },
    { name: 'Raspberry Pi', qty: 2, note: 'DNS, monitoring' },
    { name: 'Fanless 10G switch', qty: 1, note: 'quiet, warm, reliable' },
    { name: 'UPS', qty: 1, note: 'eleven minutes of runtime' },
  ],
};
