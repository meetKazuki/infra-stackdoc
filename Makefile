.PHONY: help install dev build preview clean typecheck lint \
        docker-build docker-run docker-stop \
        core-typecheck renderer-typecheck web-typecheck \
        new-lockfile

# ── Variables ──────────────────────────────────────────────────────

APP_NAME    := homelab-stackdoc
DOCKER_PORT := 8080
PNPM        := pnpm

# ── Default ────────────────────────────────────────────────────────

help: ## Show this help
	@echo ""
	@echo "  $(APP_NAME) — available commands"
	@echo "  ─────────────────────────────────────────"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Development ────────────────────────────────────────────────────

install: ## Install all dependencies
	$(PNPM) install

dev: ## Start the dev server
	$(PNPM) --filter @homelab-stackdoc/web dev

build: ## Production build
	$(PNPM) --filter @homelab-stackdoc/web build

preview: ## Serve the production build locally
	$(PNPM) --filter @homelab-stackdoc/web preview

# ── Type checking ──────────────────────────────────────────────────

typecheck: core-typecheck renderer-typecheck web-typecheck ## Typecheck all packages

core-typecheck: ## Typecheck packages/core
	$(PNPM) --filter @homelab-stackdoc/core typecheck

renderer-typecheck: ## Typecheck packages/renderer
	$(PNPM) --filter @homelab-stackdoc/renderer typecheck

web-typecheck: ## Typecheck apps/web
	cd apps/web && npx tsc --noEmit

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

# ── Cleanup ────────────────────────────────────────────────────────

clean: ## Remove all build artifacts and node_modules
	rm -rf apps/web/dist
	rm -rf packages/core/dist
	rm -rf packages/renderer/dist
	rm -rf node_modules
	rm -rf apps/web/node_modules
	rm -rf packages/core/node_modules
	rm -rf packages/renderer/node_modules

clean-dist: ## Remove build artifacts only
	rm -rf apps/web/dist
	rm -rf packages/core/dist
	rm -rf packages/renderer/dist

# ── Utilities ──────────────────────────────────────────────────────

new-lockfile: ## Regenerate the pnpm lockfile
	rm -f pnpm-lock.yaml
	$(PNPM) install

tree: ## Show project structure (requires 'tree' command)
	tree -I 'node_modules|dist|.git' --dirsfirst

loc: ## Count lines of source code
	@echo ""
	@echo "  Lines of code by package:"
	@echo "  ─────────────────────────"
	@printf "  core:      " && find packages/core/src -name '*.ts' | xargs cat | wc -l
	@printf "  renderer:  " && find packages/renderer/src -name '*.ts' -o -name '*.tsx' | xargs cat | wc -l
	@printf "  web:       " && find apps/web/src -name '*.ts' -o -name '*.tsx' | xargs cat | wc -l
	@echo ""
