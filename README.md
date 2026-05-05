# 🏦 Banco Digital - Production Grade Backend Architecture

This repository contains the backend microservices for a digital banking platform. It has been designed following **Clean Architecture**, **Domain-Driven Design (DDD)**, and **CQRS**, and has been upgraded to meet production-grade banking standards.

## 🏗️ Architecture Overview

The system consists of the following Spring Boot microservices, designed to be completely stateless and independently deployable on **Google Cloud Run** or **Kubernetes**.

1.  **API Gateway (`banco-digital-gateway`)**: The single entry point. Handles routing, rate limiting, and CORS.
2.  **Identity Service (`banco-digital-identity`)**: Manages authentication, authorization, and issues stateless JWTs.
3.  **Core Banking Service (`banco-digital`)**: The command-side (Source of Truth). Manages accounts, balances, and executes transactions enforcing strict ACID consistency via PostgreSQL.
4.  **Audit Service (`banco-digital-audit`)**: An append-only service that creates a tamper-evident audit trail of all financial events.
5.  **Reporting Service (`banco-digital-reporting`)**: The query-side (CQRS). Maintains eventually consistent read-models optimized for fast historical queries.

> **Note:** Netflix Eureka has been completely removed from this architecture to favor platform-native Service Discovery (e.g., Kubernetes DNS or Cloud Run direct URL routing).

---

## 🚀 Key Production Capabilities

### 1. Event-Driven CQRS (Kafka)
- Core service publishes `DomainEvents` (e.g., `TransactionCompleted`, `AccountOpened`) to Kafka.
- Reporting and Audit consume these events asynchronously.
- **Strict Isolation:** Reporting and Audit have their own dedicated PostgreSQL databases. They **never** directly query the Core database.

### 2. Transactional Outbox Pattern
- **Problem Avoided:** Dual-write failures (e.g., Core saves to DB but Kafka crashes).
- **Implementation:** Core saves business state and the event into an `outbox_events` table in the *same* database transaction.
- **Resilience:** A background processor (`OutboxProcessor`) polls the table, publishes to Kafka, handles exponential backoff retries, and moves failing events to a `DEAD_LETTER` state after 5 attempts.

### 3. Idempotent Consumers
- Consumers in Reporting and Audit check a `processed_events` table before acting.
- If Kafka delivers the same message twice (At-Least-Once delivery), the duplicates are safely ignored, preventing phantom balances.

### 4. Audit Hash Chaining (Tamper-Evident Storage)
- Every record inserted into the Audit database includes a `current_hash` (SHA-256) calculated from the event payload and the `previous_hash` of the preceding record.
- This creates an immutable blockchain-like structure, guaranteeing compliance and traceability.

---

## 🛠️ Local Development

### Prerequisites
- Docker & Docker Compose
- Java 17
- Maven

### Running the Infrastructure
Start the required databases, Kafka, and Zookeeper:
```bash
docker compose -f docker-compose-services.yml up -d postgres zookeeper kafka redis
```

### Running the Services
You can run each service using the Spring Boot Maven plugin. By default, they will connect to the infrastructure spun up by Docker Compose.

```bash
# In separate terminal tabs:
cd banco-digital && ./mvnw spring-boot:run
cd banco-digital-identity && ./mvnw spring-boot:run
cd banco-digital-reporting && ./mvnw spring-boot:run
cd banco-digital-audit && ./mvnw spring-boot:run
cd banco-digital-gateway && ./mvnw spring-boot:run
```

---

## ☁️ Deployment (Google Cloud)

### 1. Build and Push Images
```bash
PROJECT_ID="your-gcp-project-id"

for SERVICE in banco-digital banco-digital-identity banco-digital-audit banco-digital-reporting banco-digital-gateway; do
  gcloud builds submit $SERVICE --tag gcr.io/$PROJECT_ID/$SERVICE:latest
done
```

### 2. Deploy to Cloud Run
Ensure you set the appropriate environment variables corresponding to the Cloud SQL instances and Kafka cluster.
```bash
gcloud run deploy core-banking-service \
  --image gcr.io/$PROJECT_ID/banco-digital:latest \
  --platform managed \
  --region us-central1 \
  --set-env-vars="SPRING_PROFILES_ACTIVE=prod,SPRING_DATASOURCE_URL=jdbc:postgresql://..."
```

*(Kubernetes manifests are also available in the `/k8s` directory for GKE deployment).*

---
*Built following strict Clean Architecture and SOLID principles.*