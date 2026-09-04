---
title: Omarchy Instant
date: 2026-08-28
author: Joseph Jacks
author_url: https://github.com/josephjacks
description: I got a signed Omarchy test image onto a blank virtual NVMe in 6.829779 seconds.
---

I wanted to know if Omarchy could be put onto a blank NVMe in under seven seconds.

Not downloaded. Not booted. The clock starts when the operator confirms the drive and stops when the disk is safe to power off.

Trying to make the installer 270 times faster is the wrong approach. An installer has to resolve packages, unpack thousands of files, run hooks and build the machine one file at a time.

So I got rid of the installation part.

[Omarchy Instant](https://github.com/josephjacks/omarchy-instant) builds the system ahead of time and writes a finished signed image directly to disk. The read-only base uses compressed EROFS and dm-verity. The kernel, initramfs and command line are in a signed UKI. User files and machine state live on a separate LUKS2-encrypted btrfs partition.

The current test image deployed to a fresh virtual NVMe in **6.829779 seconds**. It booted through UEFI Secure Boot and dm-verity. All ten changed-artifact tests failed. Ten separate builds produced identical output. Eight interrupted GPT writes left the expected disk state.

An unsigned UKI did not boot. A corrupted base image did not boot.

This is not the full claim yet.

The current image is a small test system containing the exact Omarchy source snapshot we pinned. It is not yet the complete 9.5 GiB Omarchy and Hyprland desktop. The timing also came from a VM, not a real PCIe 4 NVMe.

I wrote the specification and built this with Perplexity Computer. Perplexity helped with the code, testing and proof. The first serious audit found 27 problems. Good. We kept going.

Now I want the Omarchy team to choose the machine and NVMe. I will run the full image at least ten times, cut power during the dangerous parts and publish everything, including failures.
