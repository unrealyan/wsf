# Stage 1: Build frontend
FROM node:16 AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build backend
FROM golang:1.17 AS backend-builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o websf

# Stage 3: Final runtime image
FROM alpine:3.14
WORKDIR /app

# Copy frontend build artifacts
COPY --from=frontend-builder /app/dist ./dist

# Copy backend binary
COPY --from=backend-builder /app/websf .

# Expose necessary port (adjust as needed)
EXPOSE 8080

# Run the backend program
CMD ["./websf"]