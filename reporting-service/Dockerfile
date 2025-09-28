FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/reporting-service-0.2.1.jar app.jar
EXPOSE 9096
ENTRYPOINT ["java","-jar","/app/app.jar"]
