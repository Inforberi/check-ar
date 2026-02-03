# Dev: Postgres URL для локального Docker
DEV_DATABASE_URL ?= postgresql://postgres:postgres@localhost:5438/ar_prompts

.PHONY: dev prod db-up db-down db-init backup build

# Dev: поднять Postgres, инициализировать схему, запустить next dev
dev: db-up
	@echo "Waiting for Postgres..."
	@sleep 2
	$(MAKE) db-init
	DATABASE_URL="$(DEV_DATABASE_URL)" pnpm dev

# Prod: сборка и next start (DATABASE_URL задаётся в окружении)
prod: build
	pnpm start

# Сборка для продакшена
build:
	pnpm build

# Поднять Postgres в Docker (фон)
db-up:
	docker compose up -d postgres

# Остановить Postgres
db-down:
	docker compose down

# Инициализировать схему БД (DATABASE_URL или DEV_DATABASE_URL по умолчанию)
db-init:
	DATABASE_URL="$(or $(DATABASE_URL),$(DEV_DATABASE_URL))" node scripts/init-db.mjs

# Бэкап БД через Docker (не требует pg_dump на хосте). Контейнер postgres должен быть запущен.
backup:
	@mkdir -p backups
	@docker compose exec -T postgres pg_dump -U postgres ar_prompts -F p > backups/ar_prompts_$$(date +%Y-%m-%d_%H-%M-%S).sql
	@echo "Backup saved to backups/"
	@ls -la backups/*.sql 2>/dev/null | tail -1
