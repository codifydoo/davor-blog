---
title: Rotating SSH keys without locking yourself out
date: 2026-11-03T09:18:00+01:00
number: 42
tags: [security, ssh]
lang: en
---

My main key was generated in 2021 on a laptop I no longer own. It still opened the NAS, the router and the Raspberry Pi that runs DNS. That is three machines trusting a file I can't fully account for.

The usual advice is to rotate keys every year. The usual mistake is removing the old key before the new one works everywhere, then discovering a host with password login disabled and no console cable nearby.

The order that has never failed me: generate the new key, copy it to every host, prove that it works with the old key out of the picture, and only then remove the old line from authorized_keys.

```bash title="rotate-keys.sh"
# rotate-keys.sh: add the new key before removing the old one
set -euo pipefail

NEW_KEY="$HOME/.ssh/id_ed25519_2026"
HOSTS=("nas.lan" "router.lan" "pi-dns.lan")

ssh-keygen -t ed25519 -f "$NEW_KEY" -C "davor@2026-11"

for host in "${HOSTS[@]}"; do
  ssh-copy-id -i "$NEW_KEY.pub" "$host"
  ssh -i "$NEW_KEY" -o IdentitiesOnly=yes "$host" true \
    && echo "ok: $host" || echo "FAILED: $host"
done
```

IdentitiesOnly matters here. Without it the agent offers every key it holds, the old one gets accepted, and the check passes for the wrong reason.

Once every host prints ok, I remove the old public key from each authorized_keys by its comment, then delete the private key from the agent and from disk. The whole run takes about four minutes.
