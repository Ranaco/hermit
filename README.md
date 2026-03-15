# Hermit KMS

[![CI](https://github.com/Ranaco/hermit/actions/workflows/ci.yml/badge.svg)](https://github.com/Ranaco/hermit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@hermit/cli)](https://www.npmjs.com/package/@hermit/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

A secure, enterprise-grade Key Management System (KMS) built with modern web technologies. Hermit KMS provides a RESTful API for managing encryption keys, storing secrets, and handling cryptographic operations with multi-tier security controls.

## Installation

### Homebrew (macOS / Linux)

```bash
brew tap Ranaco/homebrew-hermit
brew install hermit
```

### npm

```bash
npm install -g @hermit/cli
```

### Standalone binary

Download the pre-built binary for your platform from [GitHub Releases](https://github.com/Ranaco/hermit/releases):

| Platform | Binary |
|----------|--------|
| Linux x64 | `hermit-linux-x64` |
| macOS Intel | `hermit-macos-x64` |
| macOS Apple Silicon | `hermit-macos-arm64` |
| Windows x64 | `hermit-win-x64.exe` |

```bash
# Linux / macOS — make executable and move to PATH
chmod +x hermit-linux-x64
sudo mv hermit-linux-x64 /usr/local/bin/hermit
```

## Features

- **Multi-Tier Security**: Three levels of protection - authentication, vault-level passwords, and secret-level passwords
- **Vault-Based Organization**: Organize secrets into secure vaults with granular access control
- **Version Control**: Track changes to secrets with version history and commit messages
- **Encryption Integration**: Seamless integration with HashiCorp Vault for robust encryption
- **RESTful API**: Clean, documented API endpoints for all operations
- **User Management**: JWT-based authentication with role-based access control
- **Audit Logging**: Comprehensive logging for security and compliance
- **TypeScript**: Full type safety throughout the codebase
- **Monorepo Architecture**: Efficient development with shared packages using Turborepo

## Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Encryption**: HashiCorp Vault (Transit Engine)
- **Authentication**: JWT with bcrypt password hashing
- **Build Tool**: Turborepo for monorepo management
- **Testing**: Jest for unit and integration tests
- **Linting**: ESLint with custom configurations
- **Code Quality**: Prettier for formatting

## Architecture

This project uses a monorepo structure with the following components:

### Apps

- `api`: Main Express.js REST API server
- `hcv_engine`: HashiCorp Vault integration engine

### Packages

- `config-eslint`: Shared ESLint configurations
- `config-typescript`: Shared TypeScript configurations
- `error-handling`: Centralized error handling utilities
- `jest-presets`: Jest testing configurations
- `logger`: Isomorphic logging library
- `prisma`: Database schema and client
- `ui`: Shared UI components (if applicable)
- `vault-client`: HashiCorp Vault client wrapper

## Prerequisites

- Node.js 18 or higher
- Yarn package manager
- Docker (for PostgreSQL and Vault services)
- Git

## Quick Start

For detailed setup instructions, see [Quick Start Guide](./docs/quickstart.md).

### Documentation

- [Hermit Overview](./docs/hermit.md)
- [Architecture Overview](./docs/features/organization_system.md)
- [Frontend Guide](./docs/frontend/guide.md)
- [Bug Fixes](./docs/changelog/fixes.md)
- [API Documentation](./docs/api/README.md)

### 1. Clone and Install

```bash
git clone <repository-url>
cd hermit
yarn install
```

### 2. Start Services

```bash
# Start PostgreSQL
docker run --name hermit-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hermit \
  -p 5432:5432 \
  -d postgres:15-alpine

# Start HashiCorp Vault
docker run --name hermit-vault \
  -p 8200:8200 \
  -e 'VAULT_DEV_ROOT_TOKEN_ID=myroot' \
  -e 'VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200' \
  --cap-add=IPC_LOCK \
  -d hashicorp/vault:latest
```

### 3. Configure Environment

```bash
cd apps/api
cp .env.example .env
# Edit .env with your configuration
```

### 4. Set Up Database

```bash
cd packages/prisma
yarn prisma generate
yarn prisma migrate dev --name init
```

### 5. Build and Start

```bash
cd ../../../
yarn build
cd apps/api
yarn dev
```

The API will be available at `http://localhost:5001`.

## API Overview

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token

### Users

- `GET /api/v1/users/me` - Get current user profile

### Vaults

- `POST /api/v1/vaults` - Create a new vault
- `GET /api/v1/vaults` - List user vaults
- `PUT /api/v1/vaults/:id` - Update vault
- `DELETE /api/v1/vaults/:id` - Delete vault

### Keys

- `POST /api/v1/keys` - Create encryption key
- `GET /api/v1/keys` - List keys
- `POST /api/v1/keys/:id/encrypt` - Encrypt data
- `POST /api/v1/keys/:id/decrypt` - Decrypt data

### Secrets

- `POST /api/v1/secrets` - Store a secret
- `GET /api/v1/secrets` - List secrets (metadata only)
- `POST /api/v1/secrets/:id/reveal` - Reveal secret value
- `PUT /api/v1/secrets/:id` - Update secret (new version)
- `GET /api/v1/secrets/:id/versions` - Get version history
- `DELETE /api/v1/secrets/:id` - Delete secret

### Health Checks

- `GET /health` - Basic health check
- `GET /status` - Detailed system status

All endpoints require proper authentication via JWT tokens in the Authorization header.

## Development

### Available Scripts

From the root directory:

```bash
yarn build        # Build all packages
yarn dev          # Start development servers
yarn lint         # Run linting
yarn test         # Run tests
yarn format       # Format code with Prettier
yarn clean        # Clean build artifacts
```

### Project Structure

```
hermit/
├── apps/
│   ├── api/           # Main API server
│   └── hcv_engine/    # Vault integration
├── packages/
│   ├── config-eslint/
│   ├── config-typescript/
│   ├── error-handling/
│   ├── jest-presets/
│   ├── logger/
│   ├── prisma/
│   ├── ui/
│   └── vault-client/
├── turbo.json         # Turborepo configuration
├── package.json       # Root package file
└── yarn.lock
```

### Database Management

```bash
cd packages/prisma
yarn prisma studio     # Open Prisma Studio
yarn prisma migrate dev # Run migrations
yarn prisma db seed   # Seed database
```

## Testing

```bash
yarn test              # Run all tests
yarn test --watch      # Run tests in watch mode
```

## Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use managed PostgreSQL and Vault services
3. Configure strong JWT secrets
4. Enable HTTPS with TLS
5. Set up monitoring and logging
6. Configure rate limiting
7. Enable audit log retention

## Security Considerations

- All secrets are encrypted at rest using HashiCorp Vault
- Passwords are hashed with bcrypt
- JWT tokens have configurable expiration
- Multi-tier access control prevents unauthorized access
- Audit logs track all operations
- Rate limiting protects against abuse

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, commit conventions, the PR process, and changeset requirements.

## License

MIT — see [LICENSE](./LICENSE).

## Support

- Setup issues: [docs/quickstart.md](./docs/quickstart.md)
- Bugs: [open an issue](https://github.com/Ranaco/hermit/issues)
- Security vulnerabilities: see [SECURITY.md](./SECURITY.md)

## Roadmap

- [ ] API documentation with Swagger/OpenAPI
- [ ] Multi-factor authentication (MFA)
- [ ] Organization and team management
- [ ] Secret sharing and permissions
- [ ] Integration with cloud KMS providers
- [ ] Web dashboard UI
- [ ] Audit log retention policies
- [ ] Backup and disaster recovery
