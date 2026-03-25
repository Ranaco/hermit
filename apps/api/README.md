# Hermit KMS API

A production-ready Key Management System API built with Express, TypeScript, Prisma, and HashiCorp Vault.

Deployment note: production serves the API behind the `/api/v1` prefix.

## 🏗️ Architecture

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Secret Engine**: HashiCorp Vault Transit Engine
- **Authentication**: JWT with refresh tokens
- **MFA**: TOTP (Time-based One-Time Password)
- **Logging**: Winston
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting

### Project Structure

```
apps/api/
├── src/
│   ├── config/           # Application configuration
│   ├── controllers/      # Request handlers (TODO)
│   ├── middleware/       # Express middleware
│   │   ├── security.ts   # Helmet, CORS, rate limiting
│   │   └── context.ts    # Request tracking
│   ├── routes/           # API routes (TODO)
│   ├── services/         # Business logic
│   │   ├── prisma.service.ts
│   │   └── audit.service.ts
│   ├── utils/            # Utilities
│   │   ├── jwt.ts        # JWT operations
│   │   ├── password.ts   # Password hashing
│   │   └── mfa.ts        # MFA/TOTP
│   ├── types/            # TypeScript types
│   ├── server.ts         # Express app setup
│   └── index.ts          # Entry point
│
packages/
├── prisma/               # Database schema
├── logger/               # Winston logging
├── vault-client/         # Vault Transit Engine wrapper
└── error-handling/       # Error management

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and Yarn
- PostgreSQL 13+
- HashiCorp Vault (running locally or remote)
- Docker (optional, for running Vault and PostgreSQL)

### Installation

1. **Clone and install dependencies:**

```bash
# Install all workspace dependencies
yarn install
```

2. **Set up environment variables:**

```bash
# Copy example env file
cp apps/api/.env.example apps/api/.env

# Edit with your configuration
```

3. **Set up PostgreSQL:**

```bash
# Using Docker
docker run --name hermit-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hermit \
  -p 5432:5432 \
  -d postgres:15

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hermit"
```

4. **Set up HashiCorp Vault:**

```bash
# Using Docker (development mode - NOT for production!)
docker run --name hermit-vault \
  --cap-add=IPC_LOCK \
  -e 'VAULT_DEV_ROOT_TOKEN_ID=myroot' \
  -e 'VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200' \
  -p 8200:8200 \
  -d vault:latest

# Enable Transit Engine (Deprecated, enabled in the setup script automatically)
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='myroot'

vault secrets enable transit
vault write -f transit/keys/hermit-master-key

# Update VAULT_TOKEN in .env
VAULT_TOKEN=myroot
```

5. **Run database migrations:**

```bash
cd packages/prisma
yarn prisma migrate dev --name init
yarn prisma generate
```

6. **Build the project:**

```bash
# Build all packages
yarn build

# Or watch mode for development
yarn dev
```

7. **Start the API:**

```bash
cd apps/api
yarn dev
```

The API will be available at `http://localhost:5001`

### Verify Installation

```bash
# Health check
curl http://localhost:5001/health

# Status check (includes DB and Vault)
curl http://localhost:5001/status

# API info
curl http://localhost:5001/api/v1/info
```

## 📝 Environment Variables

See `.env.example` for all available configuration options.

### Critical Variables

- `DATABASE_URL` - PostgreSQL connection string
- `VAULT_ENDPOINT` - Vault server endpoint
- `VAULT_TOKEN` - Vault authentication token
- `JWT_ACCESS_SECRET` - JWT access token secret (**change in production!**)
- `JWT_REFRESH_SECRET` - JWT refresh token secret (**change in production!**)

## 🔐 Security Features

### Implemented

✅ **Security Headers** - Helmet with CSP, XSS protection, etc.
✅ **Rate Limiting** - Multiple tiers (general, auth, sensitive ops, crypto)
✅ **CORS** - Configurable origin whitelist
✅ **Request Tracking** - Unique request IDs and context
✅ **Error Handling** - Centralized with standardized codes
✅ **Audit Logging** - Comprehensive audit trail
✅ **JWT Authentication** - Access + refresh tokens
✅ **Password Security** - bcrypt with configurable rounds
✅ **MFA Support** - TOTP with backup codes
✅ **Vault Integration** - Transit Engine for encryption

### Security Best Practices

- All sensitive data encrypted at rest using Vault
- Passwords hashed with bcrypt (12 rounds default)
- JWT tokens with short expiry (15min access, 7day refresh)
- MFA enforcement for sensitive operations
- Device fingerprinting and trust management
- Account lockout after failed login attempts
- Comprehensive audit logging
- Rate limiting on all endpoints

## 🔑 API Endpoints

### Health & Status

- `GET /health` - Basic health check
- `GET /status` - Detailed status (DB, Vault connectivity)
- `GET /api/v1/info` - API information

### Authentication (TODO)

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/mfa/setup` - Setup MFA
- `POST /api/v1/auth/mfa/verify` - Verify MFA token

### Vaults (TODO)

- `GET /api/v1/vaults` - List vaults
- `POST /api/v1/vaults` - Create vault
- `GET /api/v1/vaults/:id` - Get vault details
- `PUT /api/v1/vaults/:id` - Update vault
- `DELETE /api/v1/vaults/:id` - Delete vault

### Keys (TODO)

- `GET /api/v1/vaults/:vaultId/keys` - List keys in vault
- `POST /api/v1/vaults/:vaultId/keys` - Create key
- `GET /api/v1/keys/:id` - Get key details
- `PUT /api/v1/keys/:id` - Update key
- `POST /api/v1/keys/:id/rotate` - Rotate key
- `POST /api/v1/keys/:id/encrypt` - Encrypt data
- `POST /api/v1/keys/:id/decrypt` - Decrypt data
- `DELETE /api/v1/keys/:id` - Delete key

## 📊 Database Schema

See `packages/prisma/schema.prisma` for the complete schema.

### Core Models

- **User** - User accounts with MFA and security settings
- **Organization** - Multi-tenancy support
- **Vault** - Secret containers
- **Key** - Encryption keys with versioning
- **KeyVersion** - Key version history
- **Session** - User sessions with device tracking
- **AuditLog** - Comprehensive audit trail
- **OneTimeShare** - Temporary secret sharing
- **Permissions** - Granular access control

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run tests for specific package
cd apps/api
yarn test

# Watch mode
yarn test --watch
```

## 🐳 Docker

```bash
# Build image
docker build -t hermit-kms-api .

# Run container
docker run -p 5001:5001 \
  -e DATABASE_URL="postgresql://..." \
  -e VAULT_TOKEN="..." \
  hermit-kms-api
```

## 📚 Development

### Adding a New Endpoint

1. Create validator in `src/validators/`
2. Create service in `src/services/`
3. Create controller in `src/controllers/`
4. Create route in `src/routes/`
5. Add route to `src/server.ts`
6. Add audit logging where appropriate

### Code Style

- ESLint for linting
- Prettier for formatting
- TypeScript strict mode
- Follow existing patterns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT

## 🛠️ Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql postgresql://postgres:postgres@localhost:5432/hermit
```

### Vault Connection Issues

```bash
# Check Vault is running
docker ps | grep vault

# Test connection
curl http://localhost:8200/v1/sys/health

# Check Transit Engine
vault secrets list
```

### Build Issues

```bash
# Clean and rebuild
yarn clean
yarn install
yarn build
```

## 📞 Support

For issues and questions, please open a GitHub issue.

## 🗺️ Roadmap

See `IMPLEMENTATION_PROGRESS.md` for detailed implementation status.

### Completed ✅

- Database schema with Prisma
- Vault Transit Engine integration
- Enhanced logging with Winston
- Error handling system
- Security middleware (Helmet, CORS, Rate Limiting)
- JWT utilities
- Password utilities with validation
- MFA/TOTP support
- Audit logging service
- Core server setup

### Planned 📋

- Email verification
- Password reset flow
- Webhook support
- API documentation (Swagger/OpenAPI)
- Comprehensive test suite
- CI/CD pipeline
- Monitoring and metrics
- Multi-region support
