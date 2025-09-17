# sncrwanda-backend Step-by-Step Run Guide

This guide explains how to build and run the sncrwanda-backend multi-module Spring Boot project on Windows.

---

## 1. Prerequisites

- **Java JDK 17 or later** (matching your Spring Boot version)
- **Maven 3.6+**
- **PostgreSQL** (if your services require a running database)
- **Docker & Docker Compose** (if you want to run with containers)

---

## 2. Clone the Repository

If you haven’t already:

1. Go to https://github.com/ and sign in (or create an account).
2. Click the **+** icon (top right) and select **New repository**.
3. Enter a repository name (e.g., `sncrwanda-backend`), set visibility, and click **Create repository**.
4. On the new repo page, copy the HTTPS URL (e.g., `https://github.com/your-username/sncrwanda-backend.git`).

Then, in your terminal:
```sh
git clone https://github.com/your-username/sncrwanda-backend.git
cd sncrwanda-backend
```

---

## 3. Build All Modules

From the root of the project:
```sh
mvn clean package -DskipTests
```
This will build all modules and create JAR files in each module’s `target/` directory.

---

## 4. Configure Environment

- Check each service’s `src/main/resources/application.yml` for database and port settings.
- Make sure PostgreSQL is running and accessible with the credentials specified in your configs.
- If using Docker Compose, review `deploy/docker-compose.yml` and update environment variables as needed.

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
cd auth-service
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
