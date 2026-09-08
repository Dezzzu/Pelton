---
title: Install on Windows
description: Install Pelton on Windows.
---

# Windows (WIP)

## Checklist
<div class="checklist" markdown>
- [ ] Download Installer
- [ ] Verify SHA-256 Checksum
- [ ] Run Installer
- [ ] Allow through SmartScreen
- [ ] Launch Pelton
- [ ] Go through onboarding
- [ ] [Add your first mailbox](../mailbox/index.md)
</div>

## Installation

### 1. Download
Download the installer from 
[pelton.app/download](https://pelton.app/download)
or from 
[GitHub Releases](https://github.com/TRC-Loop/Pelton/releases/latest)

??? info "Portable Installations and Package Managers (Winget/Chocolatey)"
    Portable `.exe`'s are not yet available but are in the works: 
    [#377](https://github.com/TRC-Loop/Pelton/issues/377).

    Until then, a workaround would be either:

    1. [Build Pelton from source](build-from-source.md)
    2. Install Pelton and grab the `.exe` from the installation directory.
    ---
    Pelton is not yet in the Chocolatey or Winget registry.
    However, this will be done in the future. See [#376](https://github.com/TRC-Loop/Pelton/issues/376)

!!! tip "Verify Checksum"
    It's **highly recommended** to verify the Checksum (SHA-256 hash) of the file you've downloaded.
    
    **What is a checksum verification?**

    Verifying the checksum means comparing a hash, 
    a short fingerprint calculated from the file's contents, 
    against the one Pelton publishes, 
    so you can confirm the download **wasn't corrupted or tampered** with in transit.
    
    **How to verify**

    When downloading from [pelton.app/download](https://pelton.app/download), you will get a command which will
    verify the checksums.

## Need help?

See [Support](../support.md).
