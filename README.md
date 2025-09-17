# SNCRWANDA Backend — Quick Start

## Requirements
- Java 21, Maven 3.9+, Docker
- Ports 8080–8085 and 5432 available

## 1) Start Postgres
```bash
cd deploy
docker compose up -d
```

## 2) Build
```bash
mvn -q -DskipTests package
```

## 3) Run (separate terminals)
```bash
java -jar api-gateway/target/api-gateway-0.2.1.jar
java -jar auth-service/target/auth-service-0.2.1.jar
java -jar ledger-service/target/ledger-service-0.2.1.jar
java -jar hr-service/target/hr-service-0.2.1.jar
java -jar student-service/target/student-service-0.2.1.jar
java -jar reporting-service/target/reporting-service-0.2.1.jar
```

## 4) Swagger
- Gateway: http://localhost:8080/swagger-ui/index.html
- Ledger: http://localhost:8082/swagger-ui/index.html
- HR: http://localhost:8083/swagger-ui/index.html
- Students: http://localhost:8084/swagger-ui/index.html
- Reporting: http://localhost:8085/swagger-ui/index.html
