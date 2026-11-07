---
title: WireGuard between two flats
date: 2026-08-24T10:00:00+02:00
number: 35
tags: [networking, security]
lang: en
description: "A site-to-site WireGuard tunnel between two homes, one of them behind carrier-grade NAT. Renumbering, keepalives, routes and firewalls."
---

This setup spans two flats: mine, and one across town where an old mini PC with a large disk holds a second copy of my backups. I wanted the two networks to reach each other as if they were one, without exposing anything to the internet except a single UDP port.

WireGuard was the obvious choice. It's in the Linux kernel, OpenWrt has packages and a UI for it, and the whole configuration fits on one screen.

## Problem one: both networks were 192.168.1.0/24

Routing between two networks only works if their addresses don't overlap. Both routers came out of the box with 192.168.1.0/24. One had to change, and I changed both, to ranges no router uses by default:

- My flat: 10.10.0.0/24
- The other flat: 10.20.0.0/24
- The tunnel itself: 10.99.0.0/24

Renumbering a home network is an afternoon of finding every device with a static address. The printer was the last one, as always.

## Problem two: the other flat is behind CGNAT

The other flat's ISP uses carrier-grade NAT. It has no public IPv4 address and can't accept incoming connections. My flat has a public address. So the other flat dials out, and sends a packet every 25 seconds to keep the connection alive. Without that, the carrier's NAT forgets the mapping and my side can no longer reach it.

```ini title="my flat: wg0.conf"
[Interface]
Address = 10.99.0.1/24
ListenPort = 51820
PrivateKey = <my private key>

[Peer]
# the other flat
PublicKey = <their public key>
AllowedIPs = 10.99.0.2/32, 10.20.0.0/24
```

```ini title="other flat: wg0.conf"
[Interface]
Address = 10.99.0.2/24
PrivateKey = <their private key>

[Peer]
PublicKey = <my public key>
Endpoint = home.example.net:51820
AllowedIPs = 10.99.0.1/32, 10.10.0.0/24
PersistentKeepalive = 25
```

`AllowedIPs` does two jobs. It decides which source addresses are accepted from that peer, and it sets the routes: traffic for 10.20.0.0/24 goes into the tunnel. Get it wrong on either side and the tunnel is up but passes nothing. `wg show` still lists the peer, so check the latest handshake and the transfer counters instead.

## Problem three: firewalls on both sides

On OpenWrt the tunnel interface gets its own firewall zone. Forwarding from that zone into the LAN is allowed only for the hosts and ports that need it: the NAS for backups, SSH to a couple of machines. It is tempting to open everything between two networks you trust. Both networks have a smart TV on them, and I don't trust either TV.

## Names

For now I use addresses across the tunnel. Proper names will come when DNS moves off the router.

## How it runs

Backups go to the other flat every night. Throughput is limited by the other flat's upload speed, not by WireGuard. The tunnel has come back on its own after every router reboot, on both sides, without me touching it.
