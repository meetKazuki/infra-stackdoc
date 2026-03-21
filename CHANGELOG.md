# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.1](https://github.com/meetKazuki/infra-stackdoc/compare/v0.1.0...v0.1.1) (2026-03-21)


### Code Refactoring

* refactor release process ([#7](https://github.com/meetKazuki/infra-stackdoc/issues/7)) ([26371ad](https://github.com/meetKazuki/infra-stackdoc/commit/26371adb204912550cd22882965c5c45faffdfd4))


### Documentation

* update documentation for branching and coolify ghcr deployment ([#12](https://github.com/meetKazuki/infra-stackdoc/issues/12)) ([258496c](https://github.com/meetKazuki/infra-stackdoc/commit/258496c0c14177fc7046e9dc58f980841b86e92e))

## [0.1.0] — 2025-03-20

### Added

- YAML schema with `meta`, `networks`, `groups`, `devices`, `connections` sections
- Parser and validator in `packages/core` (pure TypeScript, zero DOM dependencies)
- Hierarchical layout engine with BFS depth assignment, fan-out edge routing, and group-aware positioning
- Expand/collapse: click a device to reveal its children (VMs, containers) and services
- Connection re-routing: edges to collapsed children terminate at the parent
- `services` field on devices with `name`, `port`, and `runtime` (native/docker/podman)
- React renderer in `packages/renderer` with device cards, animated connection lines, group outlines
- Device type icons and colour-coded accent bars (router, switch, server, hypervisor, VM, container, camera, IoT, etc.)
- Animated directional flow on connection lines (marching dots)
- CodeMirror 6 YAML editor with syntax highlighting, line numbers, code folding, undo/redo, search
- Canvas controls: zoom in/out, fit-to-screen, reset, percentage indicator
- Share panel: export as PNG (2x resolution), copy YAML to clipboard, download YAML file
- Split-pane UI with draggable resizer
- Auto-fit graph to viewport on load
- Docker production build (multi-stage: node:20-alpine → nginx:alpine)
- Makefile with all admin commands
