FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/auth-service-0.2.1.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
