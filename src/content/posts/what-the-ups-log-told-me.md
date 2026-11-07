---
title: What the UPS log told me
date: 2026-09-30T10:00:00+02:00
number: 38
tags: [infrastructure, power]
lang: en
description: "Network UPS Tools kept a log I never read. It showed power dips I never noticed, and a shutdown plan that would not have worked."
---

The UPS has been in the cupboard for two years. It talks to the NAS over USB, and Network UPS Tools (NUT) reads its status. I set that up once, saw `OL` (online) in the status, and stopped looking.

Then I read the log.

## What was in it

Short transfers to battery. Most lasted a second or two, several times a month, almost always in the evening. Nothing in the flat flickered. The UPS caught every one of them, which is its job, but I had no idea the supply was that uneven.

The second thing was the runtime estimate. The UPS reports how long it would last at the current load. When I bought it, that number was well above twenty minutes. It is eleven now. Part of that is more equipment on it, since the switch and a Pi moved over. Part of it is the battery ageing. Both showed up in the log as a slow slide, for anyone who looked.

## The shutdown plan that wasn't

By default NUT shuts down when the UPS signals low battery. That sounds fine. The problem is what "low" means. The UPS decides, and for mine it meant a couple of minutes of runtime left. A NAS in the middle of heavy writes, plus the router and the switch, does not shut down cleanly in a couple of minutes if anything hangs.

So now the NAS shuts down after five minutes on battery, whatever the UPS thinks. In my building a cut longer than five minutes usually means a much longer one, so there is no point riding it out.

```ini title="ups.conf"
[rack]
  driver = usbhid-ups
  port = auto
  desc = "cupboard UPS"
```

```text title="upsmon.conf"
MONITOR rack@localhost 1 upsmon CHANGE_ME primary
SHUTDOWNCMD "/sbin/shutdown -h +0"
NOTIFYCMD /usr/sbin/upssched
NOTIFYFLAG ONBATT SYSLOG+EXEC
NOTIFYFLAG ONLINE SYSLOG+EXEC
```

```text title="upssched.conf"
CMDSCRIPT /usr/local/bin/upssched-cmd
PIPEFN /run/nut/upssched.pipe
LOCKFN /run/nut/upssched.lock

AT ONBATT * START-TIMER early-shutdown 300
AT ONLINE * CANCEL-TIMER early-shutdown
```

`upssched-cmd` is a three-line script. When the early-shutdown timer fires, it runs `upsmon -c fsd`, which starts a forced shutdown: the clients go first, then the NAS itself.

## Testing it

On a Sunday morning, with everything running, I pulled the plug. Five minutes later the NAS logged the timer and shut down. The pool imported cleanly on the next boot. The two Pis are NUT clients over the network and went down a few seconds before the NAS, as they should.

## Reading logs on purpose

The lesson isn't really about UPSes. A system that works quietly can still be telling you things. The monitoring Pi now graphs input voltage, battery charge and runtime, and alerts when the runtime estimate drops below eight minutes. When it does, the battery gets replaced.
