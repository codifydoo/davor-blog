---
title: Moving DNS off the router
date: 2026-10-27T10:00:00+01:00
number: 41
tags: [networking, dns]
lang: en
description: "Why name resolution now lives on a Raspberry Pi running Unbound, and the two settings that made local hostnames keep working."
---

For years the router did everything: DHCP, DNS, firewall, Wi-Fi. That is convenient until the router reboots for an upgrade and every device in the flat forgets how to find anything for two minutes. It also meant every DNS change was a router change, and I touch the router config less often than I should.

So DNS moved to the Raspberry Pi at 10.10.0.53. The router keeps DHCP, because dnsmasq is good at it and already knows every lease. The Pi runs Unbound as a recursive resolver. It asks the root servers and works its way down, instead of forwarding everything to my ISP or a public resolver.

## The split

Two jobs, two places:

- The router hands out leases and knows the names of local machines: nas.lan, pi-mon.lan, and whatever the printer calls itself this week.
- The Pi answers everything else, validates DNSSEC and caches.

Unbound has to send questions about .lan back to the router. That is a forward zone. The part that took me an evening is that Unbound, sensibly, refuses to return private addresses for names it looked up elsewhere. Unless you tell it that .lan is allowed to contain private addresses, every local lookup comes back empty.

```text title="unbound.conf"
server:
  interface: 0.0.0.0
  access-control: 10.10.0.0/24 allow
  access-control: 10.20.0.0/24 allow   # the other flat, over WireGuard

  # Rebinding protection, with an exception for our own zone
  private-address: 10.0.0.0/8
  private-address: 192.168.0.0/16
  private-domain: "lan"

  # .lan is not signed; don't try to validate it
  domain-insecure: "lan"

  # Let reverse lookups for our range reach the router
  local-zone: "10.in-addr.arpa." nodefault
  domain-insecure: "10.in-addr.arpa."

  prefetch: yes

forward-zone:
  name: "lan."
  forward-addr: 10.10.0.1

forward-zone:
  name: "10.in-addr.arpa."
  forward-addr: 10.10.0.1
```

`private-domain` is the setting I missed. `local-zone ... nodefault` is the second one. By default Unbound answers private reverse zones with nothing, which is right on the internet and wrong at home, where I want `dig -x` to tell me which device holds an address.

## Telling clients

On OpenWrt the DHCP server has to announce the Pi instead of itself. DHCP option 6 lists DNS servers. I give two: the DNS Pi first, the monitoring Pi second.

```bash title="router: dhcp"
uci add_list dhcp.lan.dhcp_option='6,10.10.0.53,10.10.0.54'
uci commit dhcp
/etc/init.d/dnsmasq restart
```

Clients pick this up when they renew their lease. A day before the switch I shortened the lease time to an hour, so nothing held on to the old answer for long.

## The second resolver

One Pi is a single point of failure in a different place, not an improvement. The monitoring Pi runs the same Unbound config. Clients don't fail over gracefully: most try the first server, wait, then try the second. A dead primary still means slow page loads. Slow is better than nothing, and the router is no longer in the path.

## Test before you switch

Before changing DHCP I ran four checks against the Pi: a local name, a reverse lookup, a domain with deliberately broken DNSSEC, and a plain public name.

```bash title="checks.sh"
dig @10.10.0.53 nas.lan +short
dig @10.10.0.53 -x 10.10.0.20 +short
dig @10.10.0.53 dnssec-failed.org | grep status   # expect SERVFAIL
dig @10.10.0.53 example.com +short
```

Router upgrades are boring now. Recursive resolution means no single upstream sees every name I look up. The cost is one more machine to keep patched, and it needed patching anyway.
