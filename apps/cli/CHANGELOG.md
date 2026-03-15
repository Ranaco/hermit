# @hermit-kms/cli

## 0.2.2

### Patch Changes

- Fix binary builds: move into-stream CJS override to root package.json so it applies during CI installs.

## 0.2.1

### Patch Changes

- Fix standalone binary builds: resolve import.meta.url shim for CJS bundle and correct pkg output naming.

## 0.2.0

### Minor Changes

- Initial public release of Hermit KMS CLI (`hermit`). Manage secrets, vaults, keys, orgs, and teams from your terminal.
