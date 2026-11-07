---
title: Notes on a fanless 10G switch
date: 2026-10-08T10:00:00+02:00
number: 39
tags: [hardware, networking]
lang: en
description: "A silent switch in a cupboard runs hot. Notes on modules, cabling and keeping an eye on temperature."
---

The switch lives in a cupboard in the hallway, next to the NAS and the router. Anything with a fan in that cupboard can be heard from the bedroom, so the switch had to be fanless. Fanless 10G switches exist. They just hand the cooling problem to you.

## Copper modules are heaters

The switch has SFP+ cages. The tempting choice is 10GBASE-T modules, because then every port takes an ordinary network cable. Those modules draw roughly two and a half to three watts each and get too hot to touch comfortably. Four of them side by side in a passive box is how you get a switch that drops links in summer.

What I use instead:

- Direct-attach copper cables (DAC) for anything in the same cupboard. They draw almost nothing and cost little.
- Short-range fibre for the run to the desk. A pair of SR modules and a duplex LC cable stay cool, and the cable is thinner than Cat 6.
- One copper 10G module for the one device that only has an RJ45 port, at the end of the row with an empty cage next to it.

## Airflow still matters

Passive cooling means the case is the heatsink, and a heatsink needs air around it. I mounted the switch vertically on the cupboard wall, fins up, with a few centimetres free on every side. That alone brought the reported temperature down by several degrees compared with lying flat on a shelf under the router.

## Watching it

The switch reports its temperature over SNMP. The monitoring Pi polls it every minute and alerts above 70 °C. It has only come close once, on a hot afternoon with the cupboard door shut. The door now stays slightly open.

```bash title="snmp-temp.sh"
# Sensor values from ENTITY-SENSOR-MIB; your vendor may use its own OID
snmpwalk -v2c -c public switch.lan 1.3.6.1.2.1.99.1.1.1.4
```

## Jumbo frames: no

I tried a 9000-byte MTU between the NAS and the desktop. Large copies got a few percent faster. Then a device that didn't support it broke silently, in a way that took an hour to find. The MTU is back at 1500 everywhere, and copies are fast enough.
