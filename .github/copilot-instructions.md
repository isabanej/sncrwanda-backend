# SNCRwanda Backend - AI Agent Guidelines

## Architecture Overview
- **Microservices**: 6-service Spring Boot 3.3.3 architecture with separate PostgreSQL schemas
- **Services**: API Gateway (9090) → Auth (9092), Ledger (9091), HR (9094), Student (9095), Reporting (9096)
- **Stack**: Java 21, Maven 3.9+, PostgreSQL 16, Spring Security JWT, OpenAPI/Swagger
- **Deployment**: Docker Compose with service orchestration, separate database schemas per service
- **Frontend**: React SPA served from `/frontend` targeting API Gateway at `localhost:9090`

## Critical Build & Development Workflows

### Quick Start Commands
```powershell
# Start infrastructure
cd deploy; docker compose up -d

# Build all services (from root)
mvn -q -DskipTests package

# Run services (separate terminals/PowerShell windows)
java -jar api-gateway/target/api-gateway-0.2.1.jar
java -jar auth-service/target/auth-service-0.2.1.jar
java -jar ledger-service/target/ledger-service-0.2.1.jar
java -jar hr-service/target/hr-service-0.2.1.jar
java -jar student-service/target/student-service-0.2.1.jar
java -jar reporting-service/target/reporting-service-0.2.1.jar
```

### Testing & API Validation
- **PowerShell Test Scripts**: Use `register_login_flow.ps1`, `student_flow.ps1`, `hr_flow.ps1` for end-to-end testing
- **Swagger UIs**: Each service exposes `/swagger-ui/index.html` (ports per service)
- **Test Structure**: `src/test/java` with `unit/`, `acceptance/`, `smoke/` packages
- **Test Command**: `mvn test` (runs unit + integration tests with TestContainers)

## Project Conventions

### Service Communication
- **Gateway Routing**: API Gateway aggregates OpenAPI docs from all services
- **Inter-service**: Services communicate via direct HTTP calls using service discovery
- **Authentication**: JWT tokens validated by Spring Security; `SecurityUtils.getBranchId()` for tenant isolation
- **Database**: Each service owns its schema (`hr`, `ledger`, `student`, `reporting`, `auth`)

### Code Patterns

#### Response/Request DTOs
```java
// Standard Response pattern - all services follow this
@Data
public class EntityResponse {
    private UUID id;
    private String name;
    // other fields
}

// Service layer conversion
private EntityResponse toResponse(Entity entity) {
    EntityResponse resp = new EntityResponse();
    resp.setId(entity.getId());
    return resp;
}
```

#### Branch-Based Security
```java
// Tenant isolation pattern used across all services
public List<EntityResponse> listAll() {
    if (SecurityUtils.isAdmin()) {
        return repo.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }
    UUID branchId = SecurityUtils.getBranchId();
    if (branchId == null) return List.of();
    return repo.findByBranchId(branchId).stream().map(this::toResponse).collect(Collectors.toList());
}
```

#### Shared Error Handling
- **Shared-libs**: `ErrorResponse` record with `timestamp`, `traceId`, `path`, `code`, `message`, `details`
- **Field Errors**: `ErrorResponse.FieldError(String field, String message)` for validation
- **Global Exception Handlers**: Each service has `@ControllerAdvice` for consistent error responses

### Database & JPA Patterns
- **Schema per Service**: `hr`, `ledger`, `student`, `reporting`, `auth` schemas in single PostgreSQL instance
- **Initialization**: `deploy/init-schemas.sql` creates schemas; services handle table creation
- **Repositories**: Standard Spring Data JPA with custom queries for branch-based filtering
- **Transactions**: `@Transactional` on service layer methods for data consistency

### Development Environment Setup
- **Ports**: Services run on 9090-9096; PostgreSQL on 5432; Frontend dev server proxy to 9090
- **Configuration**: Each service has `application.yml` with Spring profiles support
- **Docker**: Individual Dockerfiles per service; `docker-compose.yml` for local orchestration
- **Maven**: Multi-module project with `shared-libs` dependency across all services

## Key Files Reference
- `pom.xml` - Multi-module Maven project with Spring Boot 3.3.3 and Java 21
- `deploy/docker-compose.yml` - PostgreSQL + service containers with proper dependencies
- `deploy/init-schemas.sql` - Database schema initialization
- `shared-libs/` - Common error handling, validation, and utility classes
- `*-service/src/main/resources/application.yml` - Service-specific configuration
- `*.ps1` - PowerShell integration test scripts for workflow validation

## PowerShell API Testing
- **Pattern**: Scripts use `Invoke-RestMethod` with proper error handling and JSON parsing
- **Auth Flow**: Login → extract token → use `Authorization: Bearer $token` header
- **Data Files**: `temp_*.json` files contain test payloads for different entities
- **Error Handling**: Scripts capture both HTTP errors and response stream details

## Development Tips
- **Service Dependencies**: Always start auth-service before others; API Gateway aggregates all OpenAPI specs
- **Branch Context**: Most entities are branch-scoped; use `SecurityUtils.getBranchId()` for filtering
- **Database**: Each service creates its own tables; use schema prefixes in custom queries
- **Testing**: PowerShell scripts provide faster feedback than unit tests for API validation
- **Swagger**: Gateway at `:9090/swagger-ui` aggregates all service docs for unified API exploration