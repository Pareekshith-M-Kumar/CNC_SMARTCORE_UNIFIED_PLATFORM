# Stage 1: Build application with Maven
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app

# Copy pom.xml and cache dependencies
COPY pom.xml .
COPY .mvn .mvn/
RUN ./mvnw dependency:go-offline -B 2>/dev/null || true

# Copy source code and package
COPY src src/
RUN ./mvnw clean package -DskipTests -B 2>/dev/null || (apt-get update && apt-get install -y maven && mvn clean package -DskipTests -B)

# Stage 2: Lightweight runtime image
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Create unprivileged user for security
RUN groupadd -r cncsmartcore && useradd -r -g cncsmartcore cncuser

COPY --from=build /app/target/*.jar app.jar

USER cncuser:cncsmartcore

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
