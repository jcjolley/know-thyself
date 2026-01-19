# Know Thyself - Development Commands
# Usage: make <target>

.PHONY: install dev build clean lint typecheck test test-ui test-coverage rebuild help

# Default target
.DEFAULT_GOAL := help

# Install dependencies and rebuild native modules
install:
	npm install

# Start development servers (builds main first, then runs concurrently)
dev:
	npm run dev

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

# Run all tests
test:
	npm run test

# Run tests with UI
test-ui:
	npm run test:ui

# Run tests with coverage (requires 80%+)
test-coverage:
	npm run test:coverage

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf release/
	rm -rf node_modules/.cache/
	rm -rf test-results/
	rm -rf playwright-report/
	rm -rf coverage/

# Full clean including node_modules
clean-all: clean
	rm -rf node_modules/

# Rebuild native modules (after node version change)
rebuild:
	npm run postinstall

# Run all quality gates
check: typecheck lint test
	@echo "All quality gates passed!"

# Show available commands
help:
	@echo "Know Thyself - Available Commands:"
	@echo ""
	@echo "  make install       - Install dependencies"
	@echo "  make dev           - Start development servers"
	@echo "  make build         - Build for production"
	@echo "  make build-main    - Build main process only"
	@echo "  make typecheck     - Run TypeScript type checking"
	@echo "  make lint          - Run ESLint"
	@echo "  make test          - Run all Playwright tests"
	@echo "  make test-ui       - Run tests with Playwright UI"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make check         - Run all quality gates"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make clean-all     - Remove all generated files"
	@echo "  make rebuild       - Rebuild native modules"
	@echo "  make help          - Show this help message"
