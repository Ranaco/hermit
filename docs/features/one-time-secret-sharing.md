# One-Time Secret Sharing

The One-Time Secret Sharing feature allows Hermit KMS users to securely share sensitive data (passwords, tokens, custom text) with external parties via a secure, self-destructing web link.

## Overview

This feature provides a mechanism to safely transmit secrets outside the platform without requiring the recipient to have an account. Shared links are protected by industry-standard encryption, strict access controls, and automatically expire or self-destruct upon first access.

## Key Capabilities

- **Share Vault Secrets or Custom Text:** Users can share an existing `Secret` stored in their vault or enter any custom text/JSON payload directly.
- **One-Time Consumption:** Links are strictly single-use. The encrypted payload is securely destroyed from the server immediately after the first successful viewing.
- **Time-Based Expiration:** Shares can be configured to expire automatically after a specified duration (e.g., 1 hour, 24 hours, up to 1 week).
- **Passphrase Protection (Optional):** Creators can require a passphrase to unlock the secret, adding a second layer of security.
- **Recipient Experience:** A premium, visually stunning public view handles consumption status (active, expired, destroyed, invalid passphrase) securely and gracefully.

## Architecture & Security

### 1. Encryption

- All shared payloads are encrypted at rest using the HashiCorp Vault Transit Engine.
- The creator selects an existing KMS `Key` from their vault to seal the payload.
- The encrypted ciphertext is stored in the `OneTimeShare` database table (`encryptedValue`).

### 2. Access Controls & Retention

- **Creation Check:** The creator must hold the `keys:use` IAM Policy permission for the selected encryption key.
- **Auditing:** Share creations are strongly audited, appending a `SHARE_KEY` action to the system audit logs.
- **Destruction:** Once consumed or expired, the encrypted payload cannot be retrieved. The backend refuses access and only returns the dead status.

### 3. Passphrase Security

- Passphrases are never stored in plaintext. They are hashed using `bcrypt` (`passwordHash`) and validated dynamically during consumption.
- **Rate-Limiting:** The consumption endpoint (`/api/v1/shares/:token/consume`) enforces strict rate-limits and records redemption attempts to aggressively prevent passphrase brute-force attacks.

## API Endpoints

- `POST /api/v1/shares`: Creates a new one-time share. Requires authentication.
- `GET /api/v1/shares/:token`: Retrieves the share's non-sensitive metadata (expiration time, whether a passphrase is required, status). Public route.
- `POST /api/v1/shares/:token/consume`: Consumes the share, validating the optional passphrase, and returns the decrypted payload. Public route.

## UI Components

- **Creation Modal:** Located in the Dashboard under Secrets -> "Share". An intuitive interface allowing users to configure the payload, key, expiration, and passphrase.
- **Public Recipient Page (`/share/[token]`):** The endpoint where recipients securely unlock the secret. Features an isolated environment with dynamic aesthetic elements to ensure a premium User Experience while masking complexity.
