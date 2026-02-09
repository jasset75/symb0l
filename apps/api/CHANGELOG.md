# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-09

### Added

- **API Versioning**: Implemented semantic versioning strategy with support for multiple versions.
- **Sunsetting Mechanism**: Added support for `Sunset` and `Deprecation` headers, and `410 Gone` responses for sunsetted versions.
- **Health Check**: Added `/health` endpoint returning service status and version.
- **Documentation**: Detailed API documentation in `README.md`.
- **Changelog**: Added `CHANGELOG.md` to track project changes.
