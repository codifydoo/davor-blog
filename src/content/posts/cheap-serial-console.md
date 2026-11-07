---
title: A cheap serial console for every box
date: 2026-09-09T10:00:00+02:00
number: 36
tags: [hardware]
lang: en
description: "USB-to-UART adapters, a Raspberry Pi and stable device names. Out-of-band access to every machine for the price of a pizza."
---

Every machine in the cupboard can lose its network. A bad firewall rule, a broken upgrade, a kernel that can't find its root disk. When that happens SSH is no help, and carrying a monitor and keyboard to the hallway cupboard gets old fast. A serial console fixes it.

## The parts

- USB-to-UART adapters, one per machine. The ones with an FTDI chip cost a few euros, and each has a unique serial number, which matters later.
- A Raspberry Pi to plug them into. Mine is the monitoring Pi, which is on the UPS and doesn't depend on the other machines to stay reachable.
- For a machine with a real RS-232 port (the nine-pin DB9 kind), a USB-to-RS-232 adapter instead.

Do not connect a 3.3 V UART adapter to an RS-232 port. RS-232 uses much higher voltages and can destroy the adapter.

The router has a 3.3 V UART on a pin header inside the case. Connect ground, TX and RX, crossed over: the adapter's TX goes to the router's RX. Never connect the VCC pin. Both sides have their own power.

## Stable names

Plug in three adapters and you get /dev/ttyUSB0, 1 and 2, in whatever order the kernel found them. After a reboot the order can change. A udev rule gives each adapter a fixed name based on its serial number:

```text title="/etc/udev/rules.d/99-consoles.rules"
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", ATTRS{serial}=="A10KXXXX", SYMLINK+="con-router"
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", ATTRS{serial}=="A10KYYYY", SYMLINK+="con-nas"
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", ATTRS{serial}=="A10KZZZZ", SYMLINK+="con-pi-dns"
```

`udevadm info -a -n /dev/ttyUSB0 | grep serial` shows the serial number of each adapter.

## The other end

The machine has to send its console to the serial port. OpenWrt does that on its UART out of the box, at 115200 baud. On a Linux box with a serial port, tell GRUB and the kernel about it:

```bash title="/etc/default/grub"
GRUB_TERMINAL="console serial"
GRUB_SERIAL_COMMAND="serial --unit=0 --speed=115200"
GRUB_CMDLINE_LINUX="console=tty0 console=ttyS0,115200n8"
```

Then run `update-grub` and reboot. With `console=ttyS0` on the kernel command line, systemd starts a login prompt on that port by itself. Because the last `console=` entry is the primary one, boot messages and kernel panics go to the serial port, which is exactly where you want them when the network is gone.

## Connecting

From my laptop I SSH to the monitoring Pi and open the console with picocom.

```bash title="connect"
ssh pi-mon.lan
picocom -b 115200 /dev/con-router
# Ctrl-A Ctrl-X to exit
```

For one person and a few machines that's enough. With more, `conserver` or `ser2net` turn the Pi into a proper console server that logs everything each console prints, even when nobody is connected. That log is the most useful part. When a machine reboots at three in the morning, the console log shows why.

## Cost

Three adapters and some jumper wires cost less than a pizza. The first time a firewall change locked me out of the router, they paid for themselves in about ten minutes.
