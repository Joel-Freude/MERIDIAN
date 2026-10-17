# Meridian Microservices Monorepo

## Architecture Overview

```
meridian/
├── docker-compose.yml          # Full stack orchestration
├── shared/
│   ├── proto/                  # Protobuf definitions (gRPC contracts)
│   ├── events/                 # JSON Schema for Kafka domain events
│   └── types/                  # Generated TypeScript/Python types
├── services/                   # 14 microservices
│   ├── api-gateway/            # Kong API Gateway
│   ├── device-registry/        # Core device CRUD
│   ├── site-location/          # Sites, buildings, racks, geo
│   ├── topology-engine/        # Graph layouts (stateless)
│   ├── vulnerability-management/ # CVE tracking, scans
│   ├── security-events/        # SIEM, threat detection
│   ├── compliance-engine/      # Policy checks, audits
│   ├── telemetry-metrics/      # Time-series metrics
│   ├── config-management/      # Config backup/deploy/diff
│   ├── discovery-reconciliation/ # SNMP/CDP/LLDP scanning
│   ├── ipam-dhcp/              # Subnets, reservations, DNS
│   ├── notification-alerting/  # Email, Slack, PagerDuty
│   └── auth-rbac/              # SSO, API keys, RBAC
├── frontend/                   # Next.js dashboard
├── infra/                      # Terraform, Helm, k8s manifests
└── docs/
    └── architecture/
```

## Quick Start

```bash
# 1. Copy env template
cp .env.example .env

# 2. Start infrastructure
docker-compose up -d postgres redis kafka zookeeper

# 3. Run migrations (after services implement them)
docker-compose run --rm device-registry alembic upgrade head

# 4. Start all services
docker-compose up -d

# 5. Access dashboard
open http://localhost:3000
```

## Service Ports (Local)

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js Dashboard |
| API Gateway | 8000 | Kong Gateway |
| Device Registry | 8001 | Core device CRUD |
| Site/Location | 8002 | Sites, geo, racks |
| Topology Engine | 8003 | Graph layouts |
| Vulnerability Mgmt | 8004 | CVE, scans |
| Security Events | 8005 | SIEM, threats |
| Compliance Engine | 8006 | Policy, audits |
| Telemetry Metrics | 8007 | Time-series |
| Config Management | 8008 | Backup/deploy |
| Discovery/Recon | 8009 | SNMP/CDP/LLDP |
| IPAM/DHCP | 8010 | Subnets, DNS |
| Notifications | 8011 | Email, Slack |
| Auth/RBAC | 8012 | SSO, API keys |

## Shared Contracts

- **Protobuf**: `shared/proto/meridian.proto` — gRPC service definitions
- **Events**: `shared/events/domain-events.json` — Kafka domain events (JSON Schema)
- **Types**: Auto-generated via `buf generate` (Go/Python/TypeScript)

## Development Workflow

1. **Add a field** → Edit `shared/proto/meridian.proto`
2. **Generate types** → `buf generate` (updates `shared/types/`)
3. **Update service** → Implement new field in service code
4. **Run tests** → `docker-compose run --rm <service> pytest`
5. **Commit** → Types are versioned with proto

## Environment Variables

Copy `.env.example` → `.env` and configure:
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `SMTP_*` (for notifications)
- `LATLNG_API_KEY` (for geocoding)

## Testing

```bash
# Unit tests (per service)
docker-compose run --rm device-registry pytest tests/

# Integration tests
docker-compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit

# Contract tests
docker-compose run --rm contract-tests pytest tests/contracts/
```

## Deployment

- **Local**: `docker-compose up -d`
- **Kubernetes**: `helm install meridian ./infra/helm/meridian`
- **Terraform**: `cd infra/terraform && terraform apply`

## Service Template

Each service follows this structure:
```
service-name/
├── pyproject.toml          # Dependencies, build config
├── Dockerfile              # Multi-stage build
├── alembic/                # DB migrations (if applicable)
├── app/
│   ├── __init__.py
│   ├── main.py             # FastAPI app entry
│   ├── api/                # REST endpoints
│   ├── models/             # SQLAlchemy/Pydantic models
│   ├── services/           # Business logic
│   ├── repositories/       # Data access
│   └── events/             # Kafka producers/consumers
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contracts/
└── Dockerfile
```

## Key Principles

1. **Database per service** — no shared tables
2. **Async communication** — Kafka for domain events
3. **Sync for queries** — gRPC/REST via API Gateway
4. **Contract-first** — protobuf + JSON Schema before code
5. **Observability** — OpenTelemetry, structured logging, health endpoints