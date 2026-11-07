---
title: Kako sam složio kućni NAS
date: 2026-10-19T10:00:00+02:00
number: 40
tags: [hardware, storage]
lang: hr
description: "Četiri diska, dva zrcala, ZFS i raspored snimki. Što sam odabrao za kućni NAS i zašto."
---

Prvi NAS bio mi je stari laptop s USB diskom. Drugi je bio gotov uređaj s dva ležišta i web sučeljem koje je svake godine dobivalo nove značajke koje nisam trebao. Treći sam složio sam, i o njemu je ovaj tekst.

## Kućište i dijelovi

Kućište s četiri ležišta za diskove, mala matična ploča s ECC memorijom i štedljiv procesor. ECC nije obavezan za ZFS, ali memorija je jedino mjesto gdje ZFS ne može provjeriti podatke, pa sam platio razliku. Sustav je na zasebnom malom SSD-u, a četiri diska služe samo za podatke.

Diskove sam kupio u dvije trgovine, u razmaku od mjesec dana. Diskovi iz iste serije znaju otkazati u isto vrijeme, a to je točno ono što polje diskova ne smije doživjeti.

## Zašto dva zrcala, a ne RAIDZ

S četiri diska prirodan je izbor RAIDZ1: kapacitet tri diska, jedan za paritet. Ja sam odabrao dva zrcalna para, što daje kapacitet dva diska. Gubim jedan disk prostora, a dobivam tri stvari:

- Obnova nakon zamjene diska čita samo s jednog diska, a ne sa svih. Brža je i manje opterećuje preostale diskove baš kad su najranjiviji.
- Polje mogu proširiti dodavanjem još jednog para, bez premještanja podataka.
- Nasumično čitanje je brže, što se osjeti kod mnogo malih datoteka.

```bash title="zpool.sh"
# Diskovi po ID-u, ne po /dev/sdX koji se mijenja nakon restarta
zpool create -o ashift=12 tank \
  mirror /dev/disk/by-id/ata-DISK_A /dev/disk/by-id/ata-DISK_B \
  mirror /dev/disk/by-id/ata-DISK_C /dev/disk/by-id/ata-DISK_D

zfs set compression=lz4 tank
zfs set atime=off tank

zfs create tank/backup
zfs create tank/media
zfs create -o recordsize=1M tank/media/video
```

`ashift=12` znači blokove od 4 KiB. Većina modernih diskova interno koristi sektore od 4 KiB, a sustavu se predstavlja kao da ima sektore od 512 bajta. Pogrešan ashift ne može se kasnije promijeniti bez ponovnog stvaranja polja.

## Snimke

Snimke (snapshots) su razlog zašto uopće koristim ZFS. Jedna svaki sat, jedna svaki dan, jedna svaki mjesec, a stare se same brišu. Za to koristim sanoid, koji čita jednostavnu konfiguraciju:

```ini title="sanoid.conf"
[tank/backup]
  use_template = production

[tank/media]
  use_template = production
  hourly = 0

[template_production]
  hourly = 24
  daily = 30
  monthly = 6
  autosnap = yes
  autoprune = yes
```

Snimka nije backup. Ako polje nestane, nestaju i snimke. Ali od slučajnog brisanja, loše skripte ili ransomwarea na laptopu koji je imao montiranu dijeljenu mapu, snimka štiti u sekundi.

## Održavanje

Jednom mjesečno `zpool scrub` pročita sve podatke i provjeri kontrolne zbrojeve. Jednom tjedno pokreće se kratki SMART test, jednom mjesečno dugi. Rezultate prati monitoring na drugom Raspberry Piju, pa ih ne moram sam provjeravati.

Diskovi se ne gase kad miruju. Česta paljenja i gašenja troše ih više nego stalan rad.

## Što bih napravio drugačije

Od početka bih kupio kućište s tihim ventilatorima, umjesto da ih mijenjam naknadno. I ranije bih postavio obavijesti o stanju diskova. Prvi disk s greškama otkrio sam slučajno, gledajući izlaz `zpool status` iz dosade.
