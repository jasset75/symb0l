# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **symb0l-tui (Rust)**: A new terminal user interface crate inside `apps/tui/` built with `ratatui` to browse the financial symbols database and fetch real-time quotes.
- **TUI Features**:
  - Two modes: *Browse* (free, unlimited exploration) and *Quotes* (real-time prices, consumes TwelveData quota).
  - Modal filter panel to query symbols by Ticker, Name, Sector, and Profile.
  - Dynamic autocomplete for Sector and Profile, extracting values automatically from the API's `/v0/listings` endpoint.
- **Workflow Tools**: Added `mise` (`.mise.toml`) and `just` (`Justfile`) as the central toolchain and task runner managers.

### Changed
- **NPM Scripts**: Replaced the cluttered script definitions in `package.json` with `Justfile` recipes (`just dev`, `just build-all`, `just test-all`).
- **Dependencies**: Added Rust to the local stack requirements.
- **Git Hooks**: Updated `lefthook.yml` to use `just` commands instead of direct `pnpm` scripts.
