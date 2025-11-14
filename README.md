# Kira Payment Link System
## USD → MXN Cross-Border Payment Solution

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://kira-checkout.vercel.app)
[![API Gateway](https://img.shields.io/badge/API-AWS_Lambda-orange)](https://fn17rbez0g.execute-api.us-east-1.amazonaws.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Production-grade payment link system with dual PSP orchestration, flexible fee engine, and cross-border FX support.**

---

## 📋 Challenge Context

### The Assignment
Build a payment link system enabling merchants to collect **USD payments** and deliver **MXN** to recipients in Mexico.

**Core Requirements:**
- ✅ **Deep PSP Integration** → Direct card tokenization via mocked PSP APIs (Stripe + Adyen)
- ✅ **Dual PSP Orchestration** → Intelligent routing across 2 PSPs for redundancy and optimization
- ✅ **Flexible Fee Configuration** → Support fixed fees, variable fees, and fees embedded in FX rates
- ✅ **First-Transaction Incentives** → Configurable fee structures (first 3 transactions free/discounted)

**Time Constraint:** 12-16 hours

---

## 🎯 What We Built

A complete payment infrastructure comprising:

### **1. Backend API (NestJS + AWS Lambda)**
- Payment link CRUD operations
- Dual PSP orchestration with automatic failover
- Configurable fee calculation engine (Chain of Responsibility pattern)
- Mocked Stripe & Adyen integrations
- ACID transaction management with MongoDB
- Real-time FX rate service with Redis caching
- Webhook simulation for PSP callbacks

### **2. Checkout Frontend (Next.js + Vercel)**
- Hosted checkout page with responsive card form
- Mocked PSP tokenization (simulates Stripe/Adyen SDK behavior)
- Real-time fee preview with transparent breakdown
- PSP failover handling with user feedback
- Complete error state management

### **3. Infrastructure as Code (Terraform)**
- AWS Lambda deployment with API Gateway
- MongoDB Atlas cluster configuration
- Redis (Upstash) for caching
- Secrets management via AWS Systems Manager
- CloudWatch monitoring and logging

---

## 🌐 Live Deployment

| Component | URL | Description |
|-----------|-----|-------------|
| **Web Checkout** | [https://kira-checkout.vercel.app](https://kira-checkout.vercel.app) | Next.js frontend on Vercel |
| **API Gateway** | [https://fn17rbez0g.execute-api.us-east-1.amazonaws.com](https://fn17rbez0g.execute-api.us-east-1.amazonaws.com) | AWS Lambda + API Gateway |
| **API Docs** | [API Gateway URL]/api-docs | Swagger/OpenAPI documentation |

---

## 🚀 Quick Start Demo

### **Step 1: Create a Payment Link**

```bash
curl -X POST https://fn17rbez0g.execute-api.us-east-1.amazonaws.com/v1/merchant/links \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "merchant_demo_001",
    "amountInCents": 10000,
    "currency": "USD",
    "description": "Premium Subscription"
  }'
```

**Response:**
```json
{
  "id": "673566c99d8b62c24f24d46b",
  "merchantId": "merchant_demo_001",
  "amountInCents": 10000,
  "currency": "USD",
  "description": "Premium Subscription",
  "status": "pending",
  "checkoutUrl": "https://kira-checkout.vercel.app/checkout/673566c99d8b62c24f24d46b",
  "createdAt": "2025-11-14T10:30:00Z"
}
```

---

### **Step 2: Get Payment Link Details**

```bash
curl -X GET https://fn17rbez0g.execute-api.us-east-1.amazonaws.com/v1/merchant/links/673566c99d8b62c24f24d46b
```

**Response includes:**
- Payment link metadata
- Current status
- Checkout URL
- Expiration timestamp

---

### **Step 3: Customer Checkout Experience**

#### **3.1 Open Link and Fill Card Data**
Navigate to the checkout URL:
```
https://kira-checkout.vercel.app/checkout/673566c99d8b62c24f24d46b
```

![Checkout Form](web/docs/1.%20open%20link%20and%20fill%20data.png)

**Features visible:**
- Real-time fee breakdown
- USD → MXN conversion rate
- Total charge preview
- Secure card form (mocked tokenization)

---

#### **3.2 Payment Received Confirmation**

![Payment Success](web/docs/2.payment%20received.png)

**Success response includes:**
- Transaction ID
- PSP reference
- Amount charged
- Destination amount (MXN)
- Fee breakdown

---

### **Step 4: Controlled Error Handling**

#### **Error: Payment Declined**
![Payment Declined](web/docs/error%20payment.png)

Simulated card decline with user-friendly error message.

---

#### **Error: Payment Link Not Available**
![Transaction Error](web/docs/error%20transaction%20processing.png)

Network/timeout error triggering **PSP failover** from Stripe → Adyen.

---

### **Step 5: Configurable Fee Profiles**

![Fee Profile Configuration](api/docs/fee%20profile.png)

**Supports:**
- Fixed fees ($0.30 processing fee)
- Percentage fees (3.5% transaction fee)
- FX markup (2% on currency conversion)
- First-transaction incentives (waive fees for first 3 transactions)

---

### **Step 6: Webhook Simulation**

Manually trigger PSP webhook to confirm transaction:

```bash
curl -X POST https://fn17rbez0g.execute-api.us-east-1.amazonaws.com/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_webhook",
    "type": "charge.succeeded",
    "data": {
      "object": {
        "id": "ch_3Qmjhe4VDf3Z6baM0CfJZWDJ",
        "amount": 10000,
        "status": "succeeded"
      }
    }
  }'
```

**Response:**
```json
{
	"accepted": true,
	"message": "Webhook from stripe processed successfully"
}
```

---

## 📐 Architecture

### **High-Level System Design**

```
┌─────────────┐      HTTPS        ┌──────────────────┐
│   Customer  │ ────────────────> │  Next.js Frontend│
│   Browser   │ <──────────────── │   (Vercel)       │
└─────────────┘                    └──────────────────┘
                                            │
                                            │ REST API
                                            ▼
                                   ┌──────────────────┐
                                   │  API Gateway     │
                                   │  AWS Lambda      │
                                   │  (NestJS)        │
                                   └──────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
           ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
           │ MongoDB Atlas   │    │  Redis Cache    │    │  PSP Mocks      │
           │ (Transactions)  │    │  (FX Rates)     │    │  Stripe/Adyen   │
           └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Detailed Architecture Documentation**

📄 **[C4 Architecture Diagrams](api/docs/architecture-c4.md)**
- System Context Diagram
- Container Diagram
- Component Diagram
- Code Diagram (Class-level)

📄 **[Architecture Decision Records](api/docs/architecture.md)**
- Technology stack choices
- Design pattern justifications
- Infrastructure decisions

---

## 📦 Repository Structure

```
kira-payment-link/
├── api/                          # Backend API (NestJS)
│   ├── src/
│   │   ├── payment/              # Payment module
│   │   │   ├── controllers/      # API endpoints
│   │   │   ├── services/         # Business logic
│   │   │   │   ├── psp-orchestrator.service.ts   # PSP failover
│   │   │   │   ├── fee-calculator.service.ts     # Fee engine
│   │   │   │   └── ledger.service.ts             # ACID transactions
│   │   │   ├── schemas/          # MongoDB models
│   │   │   └── dtos/             # Request/response types
│   │   ├── core-services/        # Reusable services
│   │   └── config/               # Configuration
│   ├── docs/                     # Documentation
│   │   ├── 01_Payment_Link_Strategy_and_MVP_Scope.md
│   │   ├── 02_Infrastructure_Decisions_and_Tradeoffs.md
│   │   ├── architecture-c4.md
│   │   └── architecture.md
│   ├── test/                     # E2E tests
│   ├── Dockerfile                # Container definition
│   ├── serverless.yml            # AWS Lambda config
│   └── package.json
│
├── web/                          # Frontend (Next.js)
│   ├── app/
│   │   ├── checkout/[linkId]/    # Checkout page
│   │   └── api/                  # API routes
│   ├── components/ui/            # Reusable components
│   ├── docs/                     # Screenshots
│   └── package.json
│
├── infra/                        # Terraform IaC
│   ├── main.tf                   # Main infrastructure
│   ├── variables.tf              # Input variables
│   └── outputs.tf                # Output values
│
└── README.md                     # This file
```

---

## 📚 Deliverables

### **Part 1: Product + Technical Strategy**
✅ **Document:** [01_Payment_Link_Strategy_and_MVP_Scope.md](api/docs/01_Payment_Link_Strategy_and_MVP_Scope.md)

**Covers:**
- Why owning checkout UX is critical (idempotency, failover UX, data capture)
- Why dual PSP vs. single provider (resilience + cost arbitrage)
- Biggest product risk: False declines on cross-border payments
- Biggest technical risk: Ledger integrity (MongoDB ACID transactions)
- MVP scope: What to cut vs. must include
- Fee configurability vs. complexity trade-offs

---

### **Part 2: Architecture + Infrastructure**
✅ **Documents:**
- [02_Infrastructure_Decisions_and_Tradeoffs.md](api/docs/02_Infrastructure_Decisions_and_Tradeoffs.md)
- [architecture-c4.md](api/docs/architecture-c4.md) - Complete C4 diagrams
- [architecture.md](api/docs/architecture.md) - Design decisions

**Covers:**
- PSP routing strategy (primary/secondary failover)
- Card tokenization flow (mocked SDK behavior)
- Fee calculation model (Chain of Responsibility pattern)
- FX rate management (Redis caching with TTL)
- Security approach (PCI compliance, secrets management)
- Complete Terraform IaC code

---

### **Part 3: Implementation**
✅ **Working Application Deployed:**
- **Frontend:** [https://kira-checkout.vercel.app](https://kira-checkout.vercel.app)
- **Backend:** [https://fn17rbez0g.execute-api.us-east-1.amazonaws.com](https://fn17rbez0g.execute-api.us-east-1.amazonaws.com)

**Features Implemented:**
- ✅ Payment link CRUD API
- ✅ Fee calculation engine with all fee types
- ✅ PSP orchestration with failover logic
- ✅ Mocked Stripe/Adyen services (tokenization + webhooks)
- ✅ Mocked FX rate provider with configurable jitter
- ✅ Checkout page with card form
- ✅ Real-time fee display
- ✅ All UI states: loading, success, error
- ✅ Unit tests for fee calculation
- ✅ Integration tests for PSP failover
- ✅ OpenAPI/Swagger documentation

---

## 🧪 Testing

### **Run Unit Tests**
```bash
cd api
npm test

# With coverage
npm run test:cov
```


### **Test PSP Failover**
```bash
# Simulate primary PSP failure
curl -X POST https://fn17rbez0g.execute-api.us-east-1.amazonaws.com/v1/checkout/{linkId}/pay \
  -H "Content-Type: application/json" \
  -d '{
    "token": "tok_network_error",
    "customerEmail": "test@example.com"
  }'

# System automatically fails over to Adyen
```

### **Test Fee Calculation**
```bash
# Quote with fee breakdown
curl -X POST https://fn17rbez0g.execute-api.us-east-1.amazonaws.com/v1/checkout/{linkId}/quote

# Response shows:
# - Base amount
# - Fixed fee
# - Percentage fee
# - FX markup
# - Total charged
# - Destination amount (MXN)
```

---

## 🏗️ Local Development

### **Prerequisites**
- Node.js 18+
- Docker Desktop
- MongoDB (via Docker)
- Redis (via Docker or Upstash)

### **Backend Setup**
```bash
cd api
npm install
cp .env.example .env

# Start with Docker
docker-compose up -d

# Or local dev
npm run start:dev
```

**API available at:** http://localhost:3000

### **Frontend Setup**
```bash
cd web
npm install
cp .env.local.example .env.local

npm run dev
```

**Web available at:** http://localhost:3001

---

## 📊 Monitoring & Observability

### **TraceID Logging**
Every request includes unique `X-Trace-Id` header:
```
[abc123] Incoming request POST /checkout/pay
[abc123] PSP orchestrator: Attempting Stripe
[abc123] Stripe failed, failover to Adyen
[abc123] Payment successful via Adyen
[abc123] Response 200 - 350ms
```

### **Health Checks**
```bash
curl https://fn17rbez0g.execute-api.us-east-1.amazonaws.com/v1/health
```

---

## 🎓 Evaluation Criteria Addressed

| Criteria | Implementation | Evidence |
|----------|----------------|----------|
| **System Design** | ✅ Resilient architecture with smart tradeoffs | [C4 Architecture](api/docs/architecture-c4.md) • [Design Decisions](api/docs/architecture.md) |
| **Code Quality** | ✅ Clean, testable, production-grade | [Fee Calculator Tests](api/src/payment/services/fee-calculator.service.spec.ts) |
| **Infrastructure** | ✅ Terraform IaC, security, operational readiness | [Infrastructure README](infra/README.md) |
| **PSP Integration** | ✅ Tokenization, failover, PCI compliance design | [PSP Orchestrator](api/src/payment/services/psp-orchestrator.service.ts) |
| **Fee Accuracy** | ✅ Correct calculation with all fee types | [Fee Calculator Tests](api/src/payment/services/fee-calculator.service.spec.ts) |
| **Strategic Thinking** | ✅ Right priorities and risk awareness | [MVP Strategy](api/docs/01_Payment_Link_Strategy_and_MVP_Scope.md) |

---

## 📹 Video Walkthrough

**5-minute demo:** [Watch on YouTube](https://youtu.be/CJ0QqMnDjYA)

**Covers:**
1. Creating payment link via API
2. Completing checkout on web
3. PSP failover demonstration
4. Fee calculation breakdown
5. Webhook confirmation

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Jeison Aparicio**
- GitHub: [@jeisonca96](https://github.com/jeisonca96)

---

**Built with ❤️ for Kira Product Engineer Challenge**

*Total Development Time: 14 hours*
