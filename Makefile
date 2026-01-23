# Know Thyself - Development Commands
# Usage: make <target>

.PHONY: install dev dev-once build clean lint typecheck test test-unit test-full test-ui test-server test-coverage rebuild help \
        server server-dev docker-build docker-up docker-down docker-logs docker-clean

# Default target
.DEFAULT_GOAL := help

# Install dependencies and rebuild native modules
install:
	npm install

# Full Docker development cycle with file watching
# Cleans, builds, containerizes, deploys, and watches for changes
dev:
	@echo "Starting Docker development mode with file watching..."
	@echo "Press Ctrl+C to stop"
	@$(MAKE) dev-once
	@echo "Opening browser in 2 seconds..."
	@(sleep 2 && xdg-open http://localhost:3000 2>/dev/null || open http://localhost:3000 2>/dev/null || true) &
	@while true; do \
		inotifywait -r -e modify,create,delete,move \
			--include '\.(ts|tsx|css|html|json)$$' \
			--exclude '(node_modules|dist|\.git)' \
			src/ docs/journeys/ package.json vite.config.ts tsconfig.server.json Dockerfile \
			--format '%w%f' 2>/dev/null && \
		sleep 1 && \
		echo "" && \
		echo "=== Change detected, rebuilding... ===" && \
		echo "" && \
		$(MAKE) dev-once; \
	done

# Single development build cycle (no watching)
dev-once:
	@echo "=== Cleaning environment ==="
	-docker compose down 2>/dev/null || true
	rm -rf dist/
	@echo ""
	@echo "=== Building backend and frontend ==="
	npm run build:server
	npm run build:renderer
	@echo ""
	@echo "=== Building Docker image ==="
	docker compose build
	@echo ""
	@echo "=== Starting container ==="
	@echo "Server will be available at http://localhost:3000"
	docker compose up -d
	@echo ""
	@echo "=== Container started ==="
	docker compose logs -f &

# Build for production
build:
	npm run build

# Build main process only
build-main:
	npm run build:main

# Run type checking
typecheck:
	npm run typecheck

# Run linter
lint:
	npm run lint

# Run all tests (requires server running with test data)
test:
	npm run test

# Run unit tests only
test-unit:
	npm run test:unit

# Run tests with auto-started server (uses isolated test-data/)
test-full:
	START_SERVER=1 npm run test

# Run tests with UI
test-ui:
	npm run test:ui

# Start server with test database (for manual test runs)
test-server:
	DATA_DIR=./test-data npm start

# Run tests with coverage (requires 80%+)
test-coverage:
	npm run test:coverage

# === Server / Docker ===

# Build and start standalone server (web mode)
server:
	npm run build:server
	npm run build:renderer
	npm run start:server

# Run server in development mode (builds and opens browser)
server-dev:
	npm run build:server
	npm run build:renderer
	@echo "Opening http://localhost:3000 in browser..."
	@(sleep 2 && xdg-open http://localhost:3000 2>/dev/null || open http://localhost:3000 2>/dev/null || true) &
	npm run start:server

# Build Docker image
docker-build:
	npm run docker:build

# Start Docker container
docker-up:
	npm run docker:up

# Start Docker container (detached)
docker-up-detach:
	npm run docker:up:detach

# Stop Docker container
docker-down:
	npm run docker:down

# View Docker logs
docker-logs:
	npm run docker:logs

# Clean up Docker resources (removes volumes)
docker-clean:
	npm run docker:clean

# === Cleanup ===

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf release/
	rm -rf node_modules/.cache/
	rm -rf test-results/
	rm -rf playwright-report/
	rm -rf coverage/
	rm -rf test-data/

# Full clean including node_modules
clean-all: clean
	rm -rf node_modules/

# Rebuild native modules (after node version change)
rebuild:
	npm run postinstall

# Run all quality gates
check: typecheck lint build test
	@echo "All quality gates passed!"

# Show available commands
help:
	@echo "Know Thyself - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make install       - Install dependencies"
	@echo "  make dev           - Full Docker dev cycle with file watching"
	@echo "  make dev-once      - Single build/deploy cycle (no watching)"
	@echo "  make build         - Build backend and frontend for production"
	@echo "  make build-main    - Build main process only"
	@echo ""
	@echo "Server / Docker:"
	@echo "  make server        - Build and start standalone web server"
	@echo "  make server-dev    - Run server in development mode"
	@echo "  make docker-build  - Build Docker image"
	@echo "  make docker-up     - Start Docker container"
	@echo "  make docker-down   - Stop Docker container"
	@echo "  make docker-logs   - View Docker container logs"
	@echo "  make docker-clean  - Remove Docker resources and volumes"
	@echo ""
	@echo "Quality:"
	@echo "  make typecheck     - Run TypeScript type checking"
	@echo "  make lint          - Run ESLint"
	@echo "  make test          - Run Playwright tests (needs server running)"
	@echo "  make test-unit     - Run unit tests only"
	@echo "  make test-full     - Run tests with auto-started server (isolated db)"
	@echo "  make test-ui       - Run tests with Playwright UI"
	@echo "  make test-server   - Start server with test database"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make check         - Run all quality gates"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make clean-all     - Remove all generated files"
	@echo "  make rebuild       - Rebuild native modules"
	@echo "  make help          - Show this help message"
