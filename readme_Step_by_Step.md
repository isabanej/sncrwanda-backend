# sncrwanda-backend Step-by-Step Run Guide

This guide explains how to build and run the sncrwanda-backend multi-module Spring Boot project on Windows.

---

## 1. Prerequisites

- **Java JDK 17 or later** (matching your Spring Boot version)
- **Maven 3.6+**
- **PostgreSQL** (if your services require a running database)
- **Docker & Docker Compose** (if you want to run with containers)
- **Git** (for version control)

---

## 2. Clone the Repository

If you haven’t already:

1. Go to https://github.com/ and sign in (or create an account).
2. Click the **+** icon (top right) and select **New repository**.
3. Enter a repository name (e.g., `sncrwanda-backend`), set visibility, and click **Create repository**.
4. On the new repo page, copy the HTTPS URL (e.g., `https://github.com/isabanej/sncrwanda-backend.git`).

Then, in your terminal:
```sh
git clone https://github.com/isabanej/sncrwanda-backend.git
cd sncrwanda-backend
```

---

## 3. Database Setup: Automated Schema Creation

By default, the project uses a PostgreSQL database named `sncrwanda` and a separate schema for each service (e.g., `hr`, `ledger`, `student`, `reporting`, `auth`).

### A. Automated Schema Creation

Schema creation is now automated using the `init-schemas.sql` script in the `deploy/` directory. This script is mounted into the PostgreSQL container and will create all required schemas automatically when the database is first created.

You do not need to manually create schemas for each service.

### B. Update Service Configuration

In each service's `src/main/resources/application.yml`, set the correct schema in the datasource URL. For example:

- For hr-service:
  ```yaml
  spring:
    datasource:
      url: jdbc:postgresql://localhost:5432/sncrwanda?currentSchema=hr
      username: postgres
      password: postgres
  ```
- For ledger-service:
  ```yaml
  spring:
    datasource:
      url: jdbc:postgresql://localhost:5432/sncrwanda?currentSchema=ledger
      username: postgres
      password: postgres
  ```
- For student-service:
  ```yaml
  spring:
    datasource:
      url: jdbc:postgresql://localhost:5432/sncrwanda?currentSchema=student
      username: postgres
      password: postgres
  ```
- For reporting-service:
  ```yaml
  spring:
    datasource:
      url: jdbc:postgresql://localhost:5432/sncrwanda?currentSchema=reporting
      username: postgres
      password: postgres
  ```
- For auth-service:
  ```yaml
  spring:
    datasource:
      url: jdbc:postgresql://localhost:5432/sncrwanda?currentSchema=auth
      username: postgres
      password: postgres
  ```

### C. Recreate the Database

After updating docker-compose and service configurations, remove the old database volume and start fresh:

```sh
cd deploy
docker-compose down -v
docker-compose up --build
```

---

## 4. Build All Modules

From the root of the project:
```sh
mvn clean package -DskipTests
```
This will build all modules and create JAR files in each module’s `target/` directory.

---

## 5. Run Services

### Option A: Run with Docker Compose

From the `deploy/` directory:
```sh
cd deploy
docker-compose up --build
```
This will start all services and dependencies as defined in `docker-compose.yml`.

### Option B: Run Locally with Maven

From the root, start each service in a separate terminal:
```sh
cd <service-folder>
mvn spring-boot:run
```
For example:
```sh
cd hr-service
mvn spring-boot:run
```
Repeat for `api-gateway`, `hr-service`, `ledger-service`, `student-service`, and `reporting-service`.

### Option C: Run JARs Directly

After building, run each JAR:
```sh
java -jar target/<service-name>-0.2.1.jar
```
Example:
```sh
cd hr-service
java -jar target/hr-service-0.2.1.jar
```

---

## 6. Access the Services

- **API Gateway**: Usually on port 8080 or as configured.
- **Other services**: Check their `application.yml` for port numbers.
- **Swagger UI**: If enabled, visit `http://localhost:<port>/swagger-ui.html` for each service.

---

## 7. Stopping the Services

- If using Docker Compose:  
  Press `Ctrl+C` in the terminal, then run `docker-compose down` to stop and remove containers.
- If running locally:  
  Press `Ctrl+C` in each terminal window.

---

## 8. (Optional) Run Tests

To run all tests:
```sh
mvn test
```

---

## Troubleshooting: Git is not recognized

If you see an error like:

```
git : The term 'git' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

This means Git is not installed or not added to your system's PATH.

### How to Fix

1. Download Git for Windows from: https://git-scm.com/download/win
2. Run the installer and accept the default options (recommended).
3. After installation, open a new Command Prompt or PowerShell window.
4. Run:
   ```sh
   git --version
   ```
   You should see output like: `git version 2.xx.x.windows.x`

Now you can use all git commands in your terminal as described above.

---

**Summary:**
- Build with Maven  
- Configure environment/database  
- Run with Docker Compose or directly with Maven/JAR  
- Access via browser or API tools

If you need help with a specific service or error, check the logs or configuration files for more details.
