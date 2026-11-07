---
title: Why my backups live offline
date: 2026-08-06T10:00:00+02:00
number: 34
tags: [infrastructure, storage]
lang: en
description: "Online backups protect against broken disks. They don't protect against someone with root on the machine that holds them. A rotating offline disk does."
---

The NAS keeps snapshots, and everything on it is checked monthly. That covers dead disks, accidental deletions and my own mistakes. It doesn't cover the case I worry about most: someone, or something, getting root on the NAS.

## What online backups can't survive

Any backup a machine can write to, it can also delete or encrypt. Ransomware that reaches a NAS deletes the snapshots before it encrypts anything. That is standard practice now, not a clever trick. A stolen admin password does the same. So does a bad script I run myself with the wrong dataset name.

A copy on a second machine helps only as far as that machine is out of reach. If the NAS can push to it with credentials that allow deleting, an attacker on the NAS can push deletes too.

The only copy that survives a fully compromised system is one that isn't connected to it.

## The setup

Two external USB disks, each with its own encrypted ZFS pool. Once a month I plug one in, send the changes since its last run, check it, unplug it and take it away. The other disk is at the office. Next month they swap.

```bash title="cold-backup.sh"
#!/bin/sh
set -eu
SRC=tank/backup
DST=cold/backup

zpool import cold
zfs load-key cold

# The newest snapshot on the cold disk is the base for the increment
BASE=$(zfs list -H -t snapshot -o name -s creation "$DST" | tail -1 | cut -d@ -f2)
NOW=cold-$(date +%Y-%m-%d)

zfs snapshot "$SRC@$NOW"
zfs send -I "$SRC@$BASE" "$SRC@$NOW" | zfs recv -u "$DST"

zpool scrub -w cold
zpool export cold
echo "done: $DST@$NOW"
```

A few choices in there:

- The disks are encrypted, so a lost disk is a lost disk, not a leak. The passphrase is in my password manager and on paper in a drawer.
- The receive does not use `-F`. If anything changed on the cold disk since the last run, it fails loudly instead of quietly rolling back.
- The scrub reads every block back before the disk is unplugged. A backup that was never read back is a hope, not a backup.
- The cold-dated snapshots stay on the NAS so the next run has a base. I remove old ones by hand once both disks have something newer.

## The schedule is the hard part

The technical setup took an evening. The discipline is harder. A calendar reminder on the first Sunday of the month helps. So does leaving the USB cable plugged into the NAS, so the only step is fetching the disk.

In the worst case I lose a month of changes. That's a trade I'll take for a copy that nobody can reach without getting into two buildings.

## Restore drills

Twice a year I restore something from a cold disk onto a different machine: a few photos, a config directory, a database dump. I don't expect it to fail. But the first time I need a restore should not be the first time I do one.

An online copy in another flat is coming too. That one gets its own post.
