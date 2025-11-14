# Kira Payment Link API

A production-ready payment link system built with NestJS that enables merchants to create, manage, and process payment links with dual PSP orchestration (Stripe + Adyen), fee calculation, and comprehensive transaction management.

## 🌟 Overview

Kira Payment Link API is a robust payment infrastructure designed to:
- **Own the checkout experience** for maximum conversion control
- **Protect revenue** with dual PSP failover orchestration
- **Maintain financial integrity** through ACID transactions
- **Support flexible fee models** with transparent cost breakdown
- **Process cross-border payments** (USD → MXN) with FX markup

## 🚀 Quick Start

Get up and running in 3 steps:

```bash
# 1. Clone and install
git clone https://github.com/jeisonca96/kira-payment-link.git
cd kira-payment-link/api
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start with Docker
docker-compose up -d

# 4. Access API Documentation
open http://localhost:3000/api-docs
```

## 📋 Prerequisites

- **Node.js** 18+
- **npm** 9+
- **Docker** 20.10+ (for containerized deployment)
- **MongoDB** (included in docker-compose)

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

The easiest way to run the complete stack:

```bash
# Start all services (API + MongoDB)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

**Services included:**
- **API**: NestJS application on `http://localhost:3000`
- **MongoDB**: Database service on `mongodb://localhost:27017`

### Using Docker Standalone

```bash
# Build the image
docker build -t kira-payment-api .

# Run the container
docker run -p 3000:3000 \
  -e DATABASES_MONGO_URL="your-mongo-url" \
  -e JWT_SECRET="your-secret" \
  kira-payment-api
```

## 📚 API Documentation

Interactive API documentation is available via Swagger UI:

**Local:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

![Swagger Documentation](docs/images/swagger-ui.png)

### Available Endpoints

#### 🔗 Merchant Endpoints
- `POST /v1/merchant/links` - Create a new payment link
- `GET /v1/merchant/links/{id}` - Get payment link details

#### 💳 Checkout Endpoints
- `POST /v1/checkout/{linkId}/quote` - Get payment quote with fee breakdown
- `POST /v1/checkout/{linkId}/pay` - Process payment with PSP orchestration

#### 🔔 Webhook Endpoints
- `POST /v1/webhooks/stripe` - Receive Stripe webhook events
- `POST /v1/webhooks/adyen` - Receive Adyen webhook events

#### 🏥 Health Endpoints
- `GET /v1/health` - Basic health check

### Documentation Features
- **Try it out**: Execute requests directly from the browser
- **Schema definitions**: Complete request/response models
- **Authentication**: Test with API keys
- **Examples**: Sample payloads for all endpoints

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov

# View coverage report
open coverage/lcov-report/index.html
```

### Test Coverage

Current test coverage:
- **Statements**: 85%+
- **Branches**: 80%+
- **Functions**: 85%+
- **Lines**: 85%+

### E2E Tests

```bash
# Run end-to-end tests
npm run test:e2e
```

### Testing Payment Flows

```bash
# Test payment link creation
curl -X POST http://localhost:3000/v1/merchant/links \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "currency": "USD",
    "description": "Test payment",
    "expiresAt": "2025-12-31T23:59:59Z"
  }'

# Test quote endpoint
curl -X POST http://localhost:3000/v1/checkout/{linkId}/quote

# Check health
curl http://localhost:3000/v1/health
```

## ⚙️ Environment Variables

### Required Variables

```bash
# Application
NODE_ENV=production                    # Environment: development, production, test
APP_PORT=3000                          # API port
BASE_URL=http://localhost:3000         # Base URL for link generation

# Database
DATABASES_MONGO_URL=mongodb://user:pass@localhost:27017/kira-payments

# Authentication
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Payment Service Providers
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ADYEN_API_KEY=your-adyen-api-key
ADYEN_MERCHANT_ACCOUNT=YourMerchantAccount

# Fee Configuration
FEE_FIXED_AMOUNT=2.50                  # Fixed fee per transaction (USD)
FEE_PERCENTAGE=3.5                     # Percentage fee (%)
FX_MARKUP_PERCENTAGE=2.0               # FX markup on currency conversion (%)
```

### Optional Variables

```bash
# CORS
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Logging
LOG_LEVEL=info                         # debug, info, warn, error

# Redis (for caching - optional)
REDIS_URL=redis://localhost:6379
```

### Environment File Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Update with your credentials:
   ```bash
   nano .env
   ```

3. Validate configuration:
   ```bash
   npm run config:validate
   ```

## 🏗️ Architecture

### Core Features

#### 💰 Dual PSP Orchestration
- **Primary PSP**: Stripe (default routing)
- **Secondary PSP**: Adyen (automatic failover)
- **Intelligent Routing**: Automatic fallback on network errors/timeouts
- **Revenue Protection**: 15-30% downtime cost mitigation

#### 🔒 Financial Integrity
- **ACID Transactions**: MongoDB multi-document transactions
- **Atomic Updates**: Link status + Transaction creation
- **Idempotency Keys**: Prevent duplicate charges
- **Audit Trail**: Complete transaction history

#### 💵 Fee Engine
- **Configurable Models**: Fixed, percentage, or hybrid fees
- **FX Markup**: Transparent currency conversion markup
- **Full Breakdown**: Base amount, fees, FX markup, total
- **MXN Calculation**: Accurate destination amount

#### 🛡️ Security
- **Helmet Headers**: XSS, clickjacking, MIME sniffing protection
- **CORS**: Configurable origin whitelisting
- **Input Validation**: DTO-based validation pipeline
- **Sanitization**: Automatic request sanitization
- **TraceID**: Request tracking across async operations

### Project Structure

```
src/
├── config/              # Application configuration
│   └── app.config.ts   # Environment validation
├── core-services/       # Reusable services
│   ├── logger/         # TraceID logging
│   ├── exceptions/     # Custom exceptions
│   ├── validation/     # Input validation
│   └── pipes/          # Custom validation pipes
├── payment/            # Payment module
│   ├── controllers/    # API endpoints
│   ├── services/       # Business logic
│   ├── dtos/          # Request/response models
│   ├── schemas/       # MongoDB schemas
│   └── interfaces/    # TypeScript interfaces
└── health/            # Health monitoring
```

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install

# Start in development mode (hot reload)
npm run start:dev

# Build for production
npm run build

# Start production build
npm run start:prod
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Build for production |
| `npm run start:prod` | Run production build |
| `npm test` | Run unit tests |
| `npm run test:cov` | Test coverage report |
| `npm run test:e2e` | End-to-end tests |
| `npm run lint` | Lint code |
| `npm run format` | Format with Prettier |

### Code Quality

```bash
# Lint and fix
npm run lint

# Format code
npm run format

# Type check
npm run build
```

## 📊 Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/v1/health

# Response
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-11-14T10:30:00Z"
}
```

### Logging

All requests include TraceID for tracking:

```
[abc123def456] Incoming request POST /v1/checkout/pay
[abc123def456] Payment processed successfully
[abc123def456] Response 200 - 150ms
```

### Metrics

Monitor key metrics:
- Payment success rate
- PSP failover frequency
- Average response time
- Database connection status

## 🚀 Deployment

### AWS Lambda (Serverless)

```bash
# Deploy to production
serverless deploy --stage production

# Deploy specific function
serverless deploy function -f api --stage production

# View logs
serverless logs -f api --stage production --tail
```

### GitHub Actions CI/CD

Automated deployment on push to `master`:
1. Run tests
2. Build application
3. Deploy to AWS Lambda
4. Run smoke tests

## 📖 Documentation

- **[Architecture](docs/architecture.md)** - System design and C4 diagrams
- **[MVP Strategy](docs/01_Payment_Link_Strategy_and_MVP_Scope.md)** - Product decisions and trade-offs
- **[Infrastructure](docs/02_Infrastructure_Decisions_and_Tradeoffs.md)** - Technical choices
- **[SECURITY.md](SECURITY.md)** - Security features and best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
---

**Built with ❤️ using NestJS, MongoDB, and AWS Lambda**
