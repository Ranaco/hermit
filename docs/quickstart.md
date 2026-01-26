# 🚀 Hermes KMS - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Yarn package manager
- Docker (for PostgreSQL and Vault)
- Git

## Step 1: Install Dependencies

```powershell
# From the root directory
yarn install
```

This will install all dependencies for all packages in the monorepo.

## Step 2: Start Services with Docker

### Start PostgreSQL

```powershell
docker run --name hermes-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=hermes `
  -p 5432:5432 `
  -d postgres:15-alpine
```

### Start HashiCorp Vault (Dev Mode)

```powershell
docker run --name hermes-vault `
  -p 8200:8200 `
  -e 'VAULT_DEV_ROOT_TOKEN_ID=myroot' `
  -e 'VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200' `
  --cap-add=IPC_LOCK `
  -d hashicorp/vault:latest
```

### Enable Transit Engine in Vault

```powershell
# Set Vault environment variables
$env:VAULT_ADDR='http://127.0.0.1:8200'
$env:VAULT_TOKEN='myroot'

# Enable Transit secrets engine
vault secrets enable transit
```

## Step 3: Configure Environment Variables

Create `.env` file in `apps/api`:

```powershell
cd apps/api
Copy-Item .env.example .env
```

Edit `.env` with these values:

```env
# Application
NODE_ENV=development
PORT=5001
API_PREFIX=/api/v1

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hermes?schema=public"

# Vault
VAULT_ENDPOINT=http://localhost:8200
VAULT_TOKEN=myroot
VAULT_NAMESPACE=
VAULT_TRANSIT_MOUNT=transit

# JWT Secrets (change these in production!)
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000

# CORS
CORS_ORIGINS=http://localhost5001,http://localhost:5173

# Logging
LOG_LEVEL=debug
LOG_FILE_PATH=logs
```

## Step 4: Set Up Database

```powershell
# Generate Prisma client
cd packages/prisma
yarn prisma generate

# Run migrations
yarn prisma migrate dev --name init

# (Optional) Seed database
yarn prisma db seed
```

## Step 5: Build Packages

```powershell
# From root
yarn build
```

This will build all shared packages (logger, vault-client, error-handling, prisma).

## Step 6: Start the API

```powershell
cd apps/api
yarn dev
```

You should see:

```
🚀 Server running on port 5001
📊 Environment: development
🔗 API Prefix: /api/v1
```

## Step 7: Test the API

### Health Check

```powershell
curl http://localhost5001/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-02T..."
}
```

### Status Check

```powershell
curl http://localhost5001/status
```

Response:
```json
{
  "api": "operational",
  "database": "connected",
  "vault": "connected",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2025-11-02T..."
}
```

### Register a User

```powershell
curl -X POST http://localhost5001/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    \"email\": \"admin@hermes.local\",
    \"password\": \"SecurePass123!@#\",
    \"name\": \"Admin User\"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "admin@hermes.local",
      "name": "Admin User",
      ...
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  },
  "message": "User registered successfully. Please verify your email."
}
```

### Login

```powershell
curl -X POST http://localhost5001/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    \"email\": \"admin@hermes.local\",
    \"password\": \"SecurePass123!@#\"
  }'
```

### Get Current User (Protected Endpoint)

```powershell
$TOKEN="<your-access-token-from-login>"

curl http://localhost5001/api/v1/users/me `
  -H "Authorization: Bearer $TOKEN"
```

### Create a Vault

```powershell
curl -X POST http://localhost5001/api/v1/vaults `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    \"name\": \"My Secure Vault\",
    \"description\": \"Store sensitive encryption keys\",
    \"password\": \"VaultPass123!\"
  }'
```

**Note**: The `password` field is optional. If provided, all secrets in this vault will require the vault password to be revealed (unless they have their own secret-level password).

### Create an Encryption Key

```powershell
$VAULT_ID="<vault-id-from-previous-response>"

curl -X POST http://localhost5001/api/v1/keys `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    \"name\": \"master-key\",
    \"description\": \"Master encryption key\",
    \"vaultId\": \"'$VAULT_ID'\"
  }'
```

### Store a Secret (Encrypted Data)

Now you can store secrets using the encryption key. Hermes KMS supports **three-tier security**:

1. **Secret-level password** (highest) - requires password to decrypt this specific secret
2. **Vault-level password** (medium) - requires vault password (if vault has one)
3. **Authentication only** (basic) - just requires login

#### Store Secret with Secret-Level Password:

```powershell
$KEY_ID="<key-id-from-previous-response>"

curl -X POST http://localhost5001/api/v1/secrets `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    \"name\": \"aws-api-key\",
    \"description\": \"AWS Production API Key\",
    \"value\": \"AKIAIOSFODNN7EXAMPLE\",
    \"vaultId\": \"'$VAULT_ID'\",
    \"keyId\": \"'$KEY_ID'\",
    \"password\": \"SecretPass123!\",
    \"tags\": [\"production\", \"aws\"]
  }'
```

#### Store Secret without Password (Uses Vault Password or Auth Only):

```powershell
curl -X POST http://localhost5001/api/v1/secrets `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    \"name\": \"database-url\",
    \"description\": \"PostgreSQL Connection String\",
    \"value\": \"postgresql://user:pass@localhost:5432/mydb\",
    \"vaultId\": \"'$VAULT_ID'\",
    \"keyId\": \"'$KEY_ID'\"
  }'
```

### List Secrets in a Vault

```powershell
curl "http://localhost5001/api/v1/secrets?vaultId=$VAULT_ID" `
  -H "Authorization: Bearer $TOKEN"
```

Response (metadata only, no values):
```json
{
  "success": true,
  "data": {
    "secrets": [
      {
        "id": "...",
        "name": "aws-api-key",
        "description": "AWS Production API Key",
        "hasPassword": true,
        "tags": ["production", "aws"],
        "accessCount": 0,
        "createdAt": "2025-11-02T...",
        "currentVersion": {
          "versionNumber": 1
        }
      }
    ],
    "count": 1
  }
}
```

### Reveal a Secret (Decrypt and View)

#### Reveal Secret with Secret-Level Password:

```powershell
$SECRET_ID="<secret-id-from-create-response>"

curl -X POST http://localhost5001/api/v1/secrets/$SECRET_ID/reveal `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    \"password\": \"SecretPass123!\"
  }'
```

#### Reveal Secret with Vault Password (if vault has password but secret doesn't):

```powershell
curl -X POST http://localhost5001/api/v1/secrets/$SECRET_ID/reveal `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    \"vaultPassword\": \"VaultPass123!\"
  }'
```

#### Reveal Secret (Auth Only - no passwords required):

```powershell
curl -X POST http://localhost5001/api/v1/secrets/$SECRET_ID/reveal `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{}'
```

Response:
```json
{
  "success": true,
  "data": {
    "secret": {
      "id": "...",
      "name": "aws-api-key",
      "description": "AWS Production API Key",
      "value": "AKIAIOSFODNN7EXAMPLE",
      "versionNumber": 1,
      "accessCount": 1,
      "createdAt": "2025-11-02T..."
    }
  }
}
```

### Update a Secret (Creates New Version)

```powershell
curl -X PUT http://localhost5001/api/v1/secrets/$SECRET_ID `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    \"value\": \"AKIAIOSFODNN7NEWVALUE\",
    \"commitMessage\": \"Rotated AWS key after security audit\"
  }'
```

### Get Secret Version History

```powershell
curl http://localhost5001/api/v1/secrets/$SECRET_ID/versions `
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "versionNumber": 2,
        "commitMessage": "Rotated AWS key after security audit",
        "createdAt": "2025-11-02T...",
        "createdBy": { "email": "admin@hermes.local" }
      },
      {
        "versionNumber": 1,
        "commitMessage": null,
        "createdAt": "2025-11-02T..."
      }
    ],
    "count": 2
  }
}
```

### Delete a Secret

```powershell
curl -X DELETE http://localhost5001/api/v1/secrets/$SECRET_ID `
  -H "Authorization: Bearer $TOKEN"
```

---

## Legacy Key-Based Encryption (Direct Encrypt/Decrypt)

The system still supports direct encryption/decryption using keys:

### Encrypt Data

```powershell
$KEY_ID="<key-id-from-previous-response>"

curl -X POST http://localhost5001/api/v1/keys/$KEY_ID/encrypt `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    \"plaintext\": \"Hello, Hermes KMS!\"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "ciphertext": "vault:v1:abc123..."
  }
}
```

### Decrypt Data

```powershell
curl -X POST http://localhost5001/api/v1/keys/$KEY_ID/decrypt `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    \"ciphertext\": \"vault:v1:abc123...\"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "plaintext": "Hello, Hermes KMS!"
  }
}
```

## Common Commands

### View Database

```powershell
cd packages/prisma
yarn prisma studio
```

Opens Prisma Studio at http://localhost:5555

### View Logs

```powershell
# API logs
cd apps/api
Get-Content logs/combined.log -Tail 50 -Wait

# Error logs only
Get-Content logs/error.log -Tail 50 -Wait
```

### Stop Services

```powershell
# Stop Docker containers
docker stop hermes-postgres hermes-vault

# Remove containers (optional)
docker rm hermes-postgres hermes-vault
```

### Reset Database

```powershell
cd packages/prisma
yarn prisma migrate reset
```

## Troubleshooting

### Port Already in Use

If port 5001, 5432, or 8200 is already in use:

```powershell
# Find process using port
netstat -ano | findstr 5001

# Kill process
taskkill /PID <process-id> /F
```

### Database Connection Error

Make sure PostgreSQL container is running:

```powershell
docker ps | Select-String hermes-postgres
```

### Vault Connection Error

Check Vault is running and Transit engine is enabled:

```powershell
docker logs hermes-vault
```

### TypeScript Errors

If you see TypeScript errors, rebuild packages:

```powershell
yarn build
```

## Development Workflow

1. Make changes to code
2. API will auto-restart (using tsx --watch)
3. Test with curl or Postman
4. Check logs for errors
5. Repeat

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in `.env`
2. Use strong JWT secrets
3. Use managed PostgreSQL (RDS, Cloud SQL, etc.)
4. Use production Vault cluster
5. Enable HTTPS with TLS certificates
6. Configure proper CORS origins
7. Set up monitoring and alerts
8. Configure rate limiting for your scale
9. Enable audit log retention
10. Regular backups

## Next Steps

1. ✅ Test all authentication flows
2. ✅ Create organizations
3. ✅ Set up vaults with permissions
4. ✅ Test encryption/decryption
5. ✅ Enable MFA for your account
6. ✅ Review audit logs
7. ⏳ Add request validation (Zod schemas)
8. ⏳ Add API documentation (Swagger)
9. ⏳ Write integration tests
10. ⏳ Deploy to production

---

**Congratulations!** 🎉 Your Hermes KMS API is now running!
