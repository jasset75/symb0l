# Symb0l monorepo — task runner
# Install: https://just.systems
# Usage: just <recipe>

# Default: list all available recipes
default:
    @just --list

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

# Install all Node dependencies + lefthook hooks
install:
    pnpm install

# Install / update all tools declared in .mise.toml
tools:
    mise install

# Full bootstrap (tools + deps)
bootstrap: tools install

# ---------------------------------------------------------------------------
# Development
# ---------------------------------------------------------------------------

# Start the API in watch/dev mode
api:
    pnpm --filter symb0l-api dev

# Start API (background) + TUI (foreground). Kills the API when the TUI exits.
dev *ARGS:
    #!/usr/bin/env bash
    set -e
    echo "▶ Starting API…"
    pnpm --filter symb0l-api dev &
    API_PID=$!
    # Wait until the API responds on port 3000 (max 15 s)
    for i in $(seq 1 15); do
        curl -sf http://localhost:3000/health > /dev/null 2>&1 && break
        sleep 1
    done
    echo "▶ API ready — launching symb0l-tui"
    cargo run --manifest-path apps/tui/Cargo.toml -- {{ARGS}} || true
    echo "▶ TUI exited — stopping API (pid $API_PID)"
    kill "$API_PID" 2>/dev/null || true

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

# Build all artefacts: Node packages + TUI release binary
build-all: build tui-build

# Build all Node packages
build:
    pnpm -r build

# Build the TUI (release binary)
tui-build:
    cargo build --release --manifest-path apps/tui/Cargo.toml

# Install the TUI binary into ~/.cargo/bin/symb0l-tui
tui-install:
    cargo install --path apps/tui

# Run the TUI (dev build, requires API running)
tui *ARGS:
    cargo run --manifest-path apps/tui/Cargo.toml -- {{ARGS}}

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

# Run all tests: unit + integration (Node) + Rust
test-all: test-node test-integration test-rust

# Run unit tests only (Node + Rust, fast)
test: test-node test-rust

# Run Node unit tests
test-node:
    pnpm -r test

# Run Node integration tests
test-integration:
    pnpm -r test:integration

# Run Rust tests
test-rust:
    cargo test --manifest-path apps/tui/Cargo.toml

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

# Reset the database
db-reset:
    pnpm --filter @symb0l/core db:reset

# Seed the database
db-seed:
    pnpm --filter @symb0l/core db:seed

# ---------------------------------------------------------------------------
# Code quality
# ---------------------------------------------------------------------------

# Lint all packages
lint:
    pnpm -r lint

# Format all packages
format:
    pnpm -r format

# Fix all auto-fixable issues
fix:
    pnpm -r run fix:all

# ---------------------------------------------------------------------------
# Diagrams
# ---------------------------------------------------------------------------

# Compile PlantUML diagrams to SVG
diagrams:
    pnpm --filter @symb0l/core compile-diagrams
