FROM node:22-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public/assets ./public/assets
RUN npm run build

FROM golang:1.27-alpine AS backend
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY server ./server
RUN CGO_ENABLED=0 go build -o /speedball ./server

FROM alpine:3.23
RUN apk add --no-cache ca-certificates && adduser -D arena
WORKDIR /app
COPY --from=backend /speedball /app/speedball
COPY --from=frontend /app/dist /app/dist
RUN mkdir public && chown arena:arena public
USER arena
EXPOSE 8088/tcp 4433/udp
ENTRYPOINT ["/app/speedball", "-web-addr", "0.0.0.0:8088"]
