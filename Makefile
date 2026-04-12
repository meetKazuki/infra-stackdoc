.PHONY: help install dev build preview clean typecheck lint \
        docker-build docker-run docker-stop \
        core-typecheck renderer-typecheck web-typecheck \
        core-build new-lockfile

# ── Variables ──────────────────────────────────────────────────────

APP_NAME    := homelab-stackdoc
PNPM        := pnpm
DOCKER_PORT := 8080
COMPOSE 		:= docker compose

# ── Default ────────────────────────────────────────────────────────

help: ## Show this help
	@echo ""
	@echo "  $(APP_NAME) — available commands"
	@echo "  ─────────────────────────────────────────"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Local Infrastructure ───────────────────────────────────────────

infra-up: ## Start local databases and services in the background
	$(COMPOSE) up -d postgres

infra-down: ## Stop local databases and services
	$(COMPOSE) stop postgres

infra-logs: ## Tail logs for local infrastructure
	$(COMPOSE) logs -f

infra-nuke: ## DESTROY local databases and wipe all volume data
	$(COMPOSE) -v

# ── Orchestration ──────────────────────────────────────────────────

install: ## Install all dependencies
	$(PNPM) install

core-build: ## Build the core package (required before dev)
	$(PNPM) --filter @homelab-stackdoc/core build

dev: core-build ## Start the entire stack (API and Web) concurrently with hot-reload
	FORCE_COLOR=1 $(PNPM) run --parallel --filter @homelab-stackdoc/api --filter @homelab-stackdoc/web dev

build: ## Build the entire monorepo topologically (Packages -> Apps)
	$(PNPM) run -r build

preview: ## Serve the production build locally
	$(PNPM) --filter @homelab-stackdoc/web preview

clean: ## Remove all build artifacts and node_modules
	find . -name "dist" -type d -prune -exec rm -rf '{}' +
	find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

clean-dist: ## Remove build artifacts only
	find . -name "dist" -type d -prune -exec rm -rf '{}' +

# ── Type checking ──────────────────────────────────────────────────

typecheck: core-build core-typecheck renderer-typecheck web-typecheck ## Typecheck all packages

core-typecheck: ## Typecheck packages/core
	$(PNPM) --filter @homelab-stackdoc/core typecheck

renderer-typecheck: ## Typecheck packages/renderer
	$(PNPM) --filter @homelab-stackdoc/renderer typecheck

web-typecheck: ## Typecheck apps/web
	cd apps/web && npx tsc --noEmit

# ── Testing ────────────────────────────────────────────────────────

test: core-test ## Run all tests

core-test: ## Run core package tests
	$(PNPM) --filter @homelab-stackdoc/core test

# ── Docker ─────────────────────────────────────────────────────────

docker-build: ## Build the Docker image
	docker build -t $(APP_NAME) .

docker-run: ## Run the Docker container on port $(DOCKER_PORT)
	docker run -d --name $(APP_NAME) -p $(DOCKER_PORT):80 $(APP_NAME)
	@echo ""
	@echo "  Running at http://localhost:$(DOCKER_PORT)"
	@echo ""

docker-stop: ## Stop and remove the Docker container
	docker stop $(APP_NAME) 2>/dev/null || true
	docker rm $(APP_NAME) 2>/dev/null || true

docker-restart: docker-stop docker-build docker-run ## Rebuild and restart Docker

docker-logs: ## Tail Docker container logs
	docker logs -f $(APP_NAME)

# ── Utilities ──────────────────────────────────────────────────────

new-lockfile: ## Regenerate the pnpm lockfile
	rm -f pnpm-lock.yaml
	$(PNPM) install

tree: ## Show project structure (requires 'tree' command)
	tree -I 'node_modules|dist|.git' --dirsfirst

# ── Linting & formatting ──────────────────────────────────────────

lint: ## Run ESLint
	$(PNPM) run lint

lint-fix: ## Run ESLint with auto-fix
	$(PNPM) run lint:fix

format: ## Format all files with Prettier
	$(PNPM) run format

format-check: ## Check formatting without writing
	$(PNPM) run format:check
