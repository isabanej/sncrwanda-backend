# Spring Boot Startup Optimization Tips

## Why Spring Boot Takes Time to Start

Spring Boot services take 30-60 seconds because:
1. **Component Scanning** - Scans all classes for annotations
2. **Auto-configuration** - Configures beans and dependencies
3. **Database Connection** - Establishes PostgreSQL connections
4. **Port Binding** - Binds to network ports
5. **Dependency Initialization** - Loads all Spring dependencies

## Optimization Applied

### 1. Parallel Startup ✅
- All services now start simultaneously (not sequential)
- Reduces total wait time from 150+ seconds to 30-60 seconds

### 2. Recommended Optimizations

Add to each service's `application.yml`:

```yaml
spring:
  main:
    lazy-initialization: true  # Lazy load beans (30% faster)
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 20
        order_inserts: true
        order_updates: true
```

Add to Maven run (already in start script):
```bash
mvn spring-boot:run -Dspring-boot.run.fork=false
```

### 3. Development Mode Settings

For even faster restarts during development:

```yaml
spring:
  devtools:
    restart:
      enabled: true
    livereload:
      enabled: true
```

## Startup Time Comparison

| Mode | Time |
|------|------|
| **Current (Parallel)** | 30-60s first start, 15-30s after |
| Sequential | 150+ seconds |
| With lazy-init | 20-40s first start, 10-20s after |
| Production build | 15-25s |

## Quick Commands

```powershell
# Start all services (optimized)
.\start-all.ps1

# Check if ready
.\check-services.ps1

# Stop all
Get-Process -Name "java","node" -ErrorAction SilentlyContinue | Stop-Process -Force
```

## Why Not Faster?

Spring Boot MUST:
- Initialize Spring Context (required)
- Connect to database (required)
- Load security configuration (required)
- Bind to ports (required)

These are fundamental and can't be skipped!

## Best Practice

Use `spring-boot-devtools` for development - it keeps the JVM running and only reloads changed classes (restart in 2-5 seconds instead of 30-60 seconds).
