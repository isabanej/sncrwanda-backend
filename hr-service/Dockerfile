FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/hr-service-0.2.1.jar app.jar
EXPOSE 9094
ENTRYPOINT ["java","-jar","/app/app.jar"]
