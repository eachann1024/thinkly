# Code signing policy

Thinkly installers are published from the public repository [eachann1024/thinkly](https://github.com/eachann1024/thinkly).

## What is signed

Only artifacts built by this repository's GitHub Actions workflows from the public source of this repository are eligible for code signing. Local builds, forks, and files that did not come from that public CI run are not signed under this policy.

## Windows

Windows Authenticode signing is planned through the free code signing service from [SignPath.io](https://signpath.io), with the certificate issued by [SignPath Foundation](https://signpath.org), if the application is approved.

Free code signing provided by SignPath.io, certificate by SignPath Foundation.

The Windows installers currently published with each release are **not signed**.

## macOS

macOS installers use a free ad-hoc signature so the app bundle can be integrity-checked. They are not Developer ID signed and they are not notarized by Apple.

## Committers and reviewers

- [eachann1024](https://github.com/eachann1024)

## Approvers

- [eachann1024](https://github.com/eachann1024)

## Privacy policy

[PRIVACY.md](PRIVACY.md)
