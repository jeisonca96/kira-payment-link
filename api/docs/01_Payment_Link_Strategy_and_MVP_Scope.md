# Payment Link Strategy and MVP Scope

**Kira Payment Link System - 24-Hour Challenge**  
**Document Version:** 1.0  
**Date:** November 14, 2025  
**Status:** Strategic Blueprint

---

## Executive Summary

This document outlines the product and technical strategy for the Kira Payment Link System MVP, designed for execution within a 24-hour development window. The approach prioritizes revenue protection, financial integrity, and conversion optimization while making deliberate trade-offs to maximize velocity and value validation.

**Core Thesis:** Own the checkout experience to control conversion, maintain ledger integrity through ACID transactions, and protect revenue with dual-PSP orchestration.

---

## Section 1: Product Strategy and Risk Mitigation

### 1.1 Owning the Checkout UX (Conversion & Control)

**Strategic Decision:** Kira must own the entire checkout UI, not redirect to external payment pages.

**Rationale:**

- **Idempotency Control:** Prevents double charges when users refresh or resubmit payment forms. Our UI layer can implement unique request tokens and client-side guards that third-party redirects cannot provide.

- **Data Capture for Fee Engine:** Capturing granular checkout events (card entry, validation errors, submission timing) feeds our fee calculation engine and enables future optimization of pricing strategies.

- **Failover Experience Management:** When PSP failover occurs, we control the user messaging, retry UX, and trust signals. External redirects expose users to jarring brand switches and confusing error states that kill conversion.

**Outcome:** By owning the UI, we control the three pillars of payment success: consistency (no double charges), intelligence (fee optimization data), and resilience (seamless failover).

---

### 1.2 Dual PSP Orchestration

**Strategic Decision:** Integrate two Payment Service Providers (Stripe + Adyen) with intelligent routing.

**Justification - Two Pillars:**

1. **Resilience (Revenue Protection)**  
   - If Stripe experiences downtime or declines, traffic automatically routes to Adyen
   - Protects against single points of failure in payment infrastructure
   - Historical data shows PSP outages can cost 15-30% of daily revenue

2. **Cost Arbitrage (Future Optimization)**  
   - System architecture supports future routing based on cost/performance metrics
   - Different PSPs offer varying rates for cross-border vs. domestic transactions
   - Enables A/B testing of PSP performance on conversion rates

**MVP Implementation:** Primary PSP (Stripe) with automatic failover to Secondary PSP (Adyen) on network errors or timeouts.

---

### 1.3 Biggest Product Risk: False Declines and Fraud Friction

**Risk Statement:** Cross-border USD → MXN payments face inherently higher fraud detection sensitivity, resulting in false declines that hurt legitimate customers and revenue.

**Why This Matters:**
- Industry data: 10-15% of cross-border transactions are incorrectly declined
- Every false decline represents lost revenue + frustrated customer
- Overly aggressive fraud rules erode trust and conversion

**Mitigation Strategy:**
- **Primary Goal:** Optimize checkout flow to maximize "genuine payment pass-through rate" while maintaining acceptable fraud levels
- **Data-Driven Approach:** Capture decline reasons from PSPs to tune routing and retry logic
- **Future Enhancement:** Implement risk scoring to route high-risk transactions to PSPs with better acceptance rates for that profile

**MVP Scope:** Basic monitoring and logging of decline patterns. Manual review of PSP response codes to identify optimization opportunities post-launch.

---

## Section 2: Technical Strategy and Risk Mitigation

### 2.1 Biggest Technical Risk: Financial Data Consistency (Ledger Integrity)

**Risk Statement:** The absolute, non-negotiable technical risk is **ledger integrity**. Any inconsistency between Payment Link status, Transaction records, and PSP state creates financial liability, reconciliation nightmares, and customer disputes.

**MongoDB Choice - Risk and Mitigation:**

While MongoDB is not a traditional relational database, the risk is **fully mitigated** through:

- **Multi-Document ACID Transactions:** All payment and link status updates occur within MongoDB transactions (Session-based operations)
- **Atomic Operations:** Link status update and Transaction creation happen atomically or roll back together
- **Idempotency Keys:** Prevent duplicate transaction recording on retry scenarios
- **Schema Validation:** Enforce data integrity at the database level for critical financial fields

**Code Enforcement:**
```typescript
// Every financial operation follows this pattern:
const session = await connection.startSession();
session.startTransaction();
try {
  await linkRepository.updateStatus(linkId, 'paid', { session });
  await transactionRepository.create(transactionData, { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

**Outcome:** Zero tolerance for data inconsistency. Every payment state transition is atomic, traceable, and recoverable.

---

### 2.2 Fee Modeling (Configurability vs. Complexity)

**Strategic Decision:** Decouple fee calculation logic from core checkout flow using the Strategy Pattern (Rule Engine).

**Architecture Benefits:**

1. **Flexibility:** Support multiple fee models without modifying deployment code:
   - Fixed fees (e.g., $2.50 per transaction)
   - Percentage fees (e.g., 3.5% of transaction amount)
   - FX markup (e.g., 2% on currency conversion)
   - Hybrid models (Fixed + Percentage)

2. **Configurability:** Fee rules stored in database/configuration, not hardcoded
   - Enables per-merchant fee customization
   - Allows dynamic fee adjustments without redeployment
   - Supports A/B testing of fee structures

3. **Maintainability:** Clear separation of concerns:
   - Core payment flow handles orchestration
   - Fee engine handles all calculation logic
   - Easy to unit test fee scenarios independently

**MVP Implementation:**
- Configuration-driven fee calculation with default rules
- Full fee breakdown in transaction response (Base Amount, Fee, FX Markup, Total)
- MXN destination amount calculation using configured exchange rates

**Trade-off:** More upfront complexity for long-term flexibility. This is the correct trade-off for a payment platform that will scale across multiple merchants with varying business models.

---

### 2.3 PSP Abstraction Layer

**Technical Strategy:** Implement adapter pattern for PSP integration to enable seamless switching and testing.

**Benefits:**
- **Testability:** Mock PSP responses for comprehensive test coverage
- **Flexibility:** Add new PSPs without modifying core payment logic
- **Resilience:** Standardized error handling across all PSPs

**MVP Scope:** Basic abstraction with Stripe and Adyen adapters, standardized response mapping.

---

## Section 3: MVP Scope and Trade-offs (The 24-Hour Plan)

### 3.1 MUST INCLUDE (The Core)

These features are **non-negotiable** for MVP validation:

#### ✅ ACID Ledger (Financial Integrity)
- **Transaction Recording:** Every payment attempt creates an immutable transaction record
- **Link Status Updates:** Atomic updates to Payment Link status (pending → paid → expired)
- **MongoDB Transactions:** All financial operations use multi-document ACID transactions
- **Idempotency:** Request-level idempotency to prevent duplicate charges

**Validation Criteria:** Manual testing of concurrent payment scenarios, transaction rollback on failures.

---

#### ✅ PSP Failover (Revenue Protection)
- **Primary-to-Secondary Routing:** Simple network error/timeout detection triggers fallback
- **Failover Logic:** 
  1. Attempt payment with Primary PSP (Stripe)
  2. On network error/timeout/5xx response → Attempt Secondary PSP (Adyen)
  3. Log failover event for analytics
- **User Experience:** Seamless retry without user interaction

**Validation Criteria:** Manual testing with simulated Stripe failures, verify Adyen processes payment.

---

#### ✅ Fee/FX Calculation (Revenue Model)
- **Full Fee Breakdown:** 
  - Base transaction amount (USD)
  - Platform fee (configurable: fixed, percentage, or hybrid)
  - FX markup (configurable percentage on conversion)
  - Total amount charged to customer
- **MXN Destination Amount:** Accurate calculation of amount merchant receives in MXN
- **Transparent Display:** All fees shown to customer before payment submission

**Validation Criteria:** Unit tests for all fee calculation scenarios, manual verification of amounts.

---

#### ✅ Core API Endpoints
- **POST /payment-links:** Create new payment link
- **GET /payment-links/:id:** Retrieve payment link details
- **POST /checkout/:linkId:** Process payment with PSP orchestration
- **POST /webhooks/stripe:** Receive Stripe webhook events
- **POST /webhooks/mercadopago:** Receive Adyen webhook events
- **GET /health:** System health check

---

### 3.2 DELIBERATE CUTS (What Was Excluded to Meet Deadline)

These features are **explicitly excluded** from the 24-hour MVP. This is not technical debt—it's strategic focus.

#### ❌ Intelligent Routing
**What We're Cutting:**
- Load balancing across PSPs based on current success rates
- Lowest-cost routing based on real-time fee comparison
- Geographic routing optimization
- Transaction-type-based routing (card vs. bank transfer)

**Why:**
- Complex routing requires production traffic data to tune
- Initial routing is simple and effective: "Stripe First, Adyen on Failure"
- Over-engineering routing without traffic data is speculation

**Future Implementation:** Post-MVP after collecting 2-4 weeks of production data on PSP performance.

---

#### ❌ Merchant Webhooks (Outbound)
**What We're Cutting:**
- Automated webhook delivery to merchant endpoints
- Webhook retry logic and exponential backoff
- Webhook signature verification for merchant endpoints
- Webhook event queue and delivery tracking

**What We're Keeping:**
- Inbound webhook endpoints to receive PSP notifications (MUST HAVE for payment confirmation)
- Webhook validation for incoming PSP events

**Why:**
- PSP webhooks (inbound) are critical for payment confirmation—cannot be cut
- Merchant webhooks (outbound) can be replaced with polling/dashboard in MVP
- Webhook delivery infrastructure adds significant complexity (retry logic, failure handling, monitoring)

**Validation Strategy:** Manual testing of inbound PSP webhooks using PSP test tools (Stripe CLI, Adyen sandbox).

**Future Implementation:** Post-MVP with proper queue infrastructure (SQS/RabbitMQ) for reliable delivery.

---

#### ❌ Full CRUD for Payment Links
**What We're Cutting:**
- **PUT /payment-links/:id** - Update existing payment link
- **DELETE /payment-links/:id** - Delete payment link

**What We're Keeping:**
- **POST /payment-links** - Create new payment link (MUST HAVE)
- **GET /payment-links/:id** - Read payment link details (MUST HAVE)

**Why:**
- Payment links are intended to be immutable once created (financial audit trail)
- Link expiration is handled automatically by expiration timestamp
- Update/Delete endpoints add complexity without validating core value proposition

**Workaround:** Create new payment link if merchant needs to change amount/details.

**Future Implementation:** Consider soft-delete and status updates (e.g., "cancelled") post-MVP.

---

#### ❌ Additional Cuts for Speed
- **Advanced Error Recovery:** Complex retry logic, circuit breakers → Simple failover only
- **Rate Limiting:** API throttling → Rely on AWS Lambda concurrency limits
- **Caching Layer:** Redis caching for link data → Direct database queries (acceptable for MVP load)
- **Comprehensive Logging:** Structured logs with ELK stack → Basic CloudWatch logs
- **Admin Dashboard:** Web UI for monitoring → AWS Console + API testing tools

---

### 3.3 MVP Success Criteria

**The MVP is successful if:**

1. ✅ A payment link can be created with configurable amounts and fees
2. ✅ A customer can complete a payment using the hosted checkout page
3. ✅ Payment state is recorded atomically in MongoDB (Transaction + Link Status)
4. ✅ PSP failover is triggered and successfully processes payment when primary PSP fails
5. ✅ Fee breakdown is accurate and transparent in all API responses
6. ✅ System can be deployed to AWS Lambda and passes smoke tests

**What Success Does NOT Require:**
- Production-grade monitoring and alerting
- Zero manual intervention for testing
- Support for high-volume concurrent transactions
- Comprehensive edge case handling

---

## Conclusion: Focused Scope for Maximum Velocity

This 24-hour MVP is designed with one goal: **Validate the core value proposition with minimal complexity.**

**The Bets We're Making:**
1. **Own the UX:** Controlling the checkout experience is worth the frontend complexity
2. **Dual PSP:** Resilience is more valuable than simplicity in payment infrastructure
3. **ACID First:** Financial integrity is non-negotiable, even in an MVP
4. **Cut Aggressively:** Intelligent routing, outbound webhooks, and full CRUD can wait

**The Result:**
A deployable, testable payment link system that demonstrates:
- Revenue protection through PSP failover
- Financial integrity through ACID transactions
- Revenue model validation through fee calculation
- Technical feasibility through Lambda deployment

**Next Steps Post-MVP:**
1. Collect production traffic data for intelligent routing optimization
2. Implement merchant webhook delivery infrastructure
3. Add monitoring, alerting, and operational tooling
4. Expand CRUD capabilities based on merchant feedback
5. Optimize for performance and cost efficiency

---

**This is not a perfect system. This is a focused system designed to learn fast and validate assumptions under extreme time constraints.**

**Execution starts now.**
