FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/auth-service-0.2.1.jar app.jar
EXPOSE 9092
ENTRYPOINT ["java","-jar","/app/app.jar"]
