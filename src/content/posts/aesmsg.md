---
title: "aesmsg: encrypted links for the apps you already use"
date: 2026-11-07T21:30:00+01:00
number: 1
tags: [security, mobile, aesmsg]
lang: en
description: "Why we built aesmsg, a zero-knowledge layer that turns a secret into a link you can paste into Slack, WhatsApp or email, and two bugs that only showed up on real phones."
---

Every team I have worked with sends passwords over chat. An API key goes into a Slack DM, a database password into WhatsApp, a client's credentials into an email thread that twelve people can search for the next ten years. Everyone knows it is wrong. Nobody wants to install a new messenger to fix it.

[aesmsg](https://aesmsg.com) is what we built at Codify to deal with that. It is not a chat app. It turns a message or a file into a link, and you paste that link into whatever channel you were going to use anyway. The channel only ever carries the link. Only the person it was encrypted for can open it.

## How it works

1. You write the message, or attach a file, in the aesmsg app.
2. The app encrypts it on your phone, to the recipient's public key.
3. Only the ciphertext and a little metadata go to the server. The server hands back a link.
4. You paste the link into Slack, WhatsApp, email, SMS, anything.
5. The recipient taps it, the app downloads the ciphertext, and their private key decrypts it on their device after Face ID or a fingerprint.

Links expire on a timer (10 minutes, an hour, a day, a week) or after a set number of opens. The sender can revoke a link at any time. Expiry, last open and revoke all delete the ciphertext from the server, not just hide it.

The server never sees plaintext, private keys, previews or filenames. Filenames and file types are inside the encrypted envelope. What it does store is the link ID, the ciphertext, the expiry, the open limit and an open count. That is the whole database.

## The crypto, briefly

Each message is sealed with HPKE (RFC 9180): X25519 for the key exchange, HKDF-SHA256, and AES-256-GCM. We didn't invent anything here, and that was the point. The link ID, expiry and open limit are bound into the ciphertext as additional authenticated data. A server that tries to serve a ciphertext under a different link, or with a longer expiry, produces something that fails to decrypt.

Trust in someone's key comes from comparing a short fingerprint out of band, read aloud or scanned as a QR code. It looks like `AM-A91C-22F0-78BB-…`. If the two of you see the same fingerprint, nobody in the middle swapped the key.

Private keys never leave the device unless you export an encrypted backup. On the phone the key is wrapped with a random device secret that sits in the Secure Enclave or StrongBox behind biometrics. A backup file is wrapped with your passphrase through Argon2id, with settings heavy enough to make guessing expensive.

There is also a section in our [security model](https://github.com/codifydoo/aesmsg/blob/main/docs/security-model.md) titled "No forward secrecy", and I think it is the most important page in the repo. Messages are sealed to the recipient's long-lived key. If that key is stolen later, any ciphertext an attacker already copied can be decrypted. Deleting ciphertext on expiry and supporting key rotation shrink that window, but they don't close it. I would rather say that plainly than write "military-grade" on the landing page.

## Two bugs that only real phones found

The crypto core had tests, interop fixtures and a cross-process browser test that seals, links, opens, decrypts and revokes against a real API. The bugs that hurt were not in any of that.

### Android sent a NUL byte

The open and revoke endpoints take no request body, and the API rejects any body at all. That keeps a future token or proof from sneaking into the body instead of a header. iPhones worked. Every Android phone got "This does not look like a valid secure message" on every link, whichever platform had sealed it.

The cause was three layers down. Expo's `fetch` on Android sits on OkHttp, which refuses a POST without a body. When you don't pass one, the native layer quietly substitutes a single zero byte. The server saw a one-byte body and returned 400 before counting the open. That is how we isolated it: the open count stayed at zero.

The fix went in twice. The server now treats exactly one NUL byte as empty, which repaired the Android builds already on people's phones without an app release:

```ts title="messages-handler.ts"
function isEmptyBody(raw: string): boolean {
  return raw.length === 0 || raw === "\0";
}
```

Anything with real content, even a body that merely starts with a NUL, is still rejected. The app now passes an explicit empty string as the body, which makes OkHttp send a true `Content-Length: 0`. The comment above that line ends by asking the next person not to "simplify" it away, because it really does look like dead code.

### The links pointed at the wrong host

Tapping a link is supposed to open the app directly. iOS and Android decide whether to do that by fetching an association file from the link's domain: `apple-app-site-association` for Apple and `assetlinks.json` for Google. Neither will follow a redirect to get it.

Our links were minted on `aesmsg.com`, and the apex redirected everything to `www`, the association files included. So the OS could never verify the domain, and every tap went through the browser fallback page first. The fix was to mint links on `www.aesmsg.com`.

iOS claims both hosts, because Apple checks each domain separately and an unreachable one costs nothing. Android claims only `www`. Before Android 12, verification is all or nothing across every host the app claims, and one bad host would have broken the good one too.

The same week Apple's file was also being served as `application/octet-stream`, because it has no extension, and a `nosniff` header stopped anything from guessing. Apple wants `application/json`. That was one line of config.

## Where it is now

The [iOS app](https://apps.apple.com/app/aesmsg/id6775473926) is in the App Store. There is also a browser client at [app.aesmsg.com](https://app.aesmsg.com) that does all of its crypto in the page and talks only to the API. The backend is three small services: the API, a worker that purges expired ciphertext, and a static site.

All of it is open source under Apache 2.0 at [github.com/codifydoo/aesmsg](https://github.com/codifydoo/aesmsg). If you send secrets over chat, and you do, try it. If you find something wrong with the crypto, I want to hear about it more than anything else.
