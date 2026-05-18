# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.5.0](https://github.com/meetKazuki/infra-stackdoc/compare/v0.4.0...v0.5.0) (2026-05-18)


### Features

* add app navigation ([#59](https://github.com/meetKazuki/infra-stackdoc/issues/59)) ([0403284](https://github.com/meetKazuki/infra-stackdoc/commit/0403284aa30c1c558412685df354d7cd055198e2))
* Add Landing Page ([#57](https://github.com/meetKazuki/infra-stackdoc/issues/57)) ([79b7e6a](https://github.com/meetKazuki/infra-stackdoc/commit/79b7e6a212031c78105ea67ecef8eda184d81a40))
* polish community gallery ([#56](https://github.com/meetKazuki/infra-stackdoc/issues/56)) ([5e80df3](https://github.com/meetKazuki/infra-stackdoc/commit/5e80df344581693dc32c1fd812b63d908cb61d7c))
* polish my configs ([#55](https://github.com/meetKazuki/infra-stackdoc/issues/55)) ([282dfeb](https://github.com/meetKazuki/infra-stackdoc/commit/282dfeb4776d1912dc24172004c661b509998365))
* sync `master` with latest changes ([b012923](https://github.com/meetKazuki/infra-stackdoc/commit/b012923dbc6971e4e40d342d572fb10a4225dfa0))
* Sync `master` with Latest Changes ([b012923](https://github.com/meetKazuki/infra-stackdoc/commit/b012923dbc6971e4e40d342d572fb10a4225dfa0))


### Bug Fixes

* fix preview bug ([#58](https://github.com/meetKazuki/infra-stackdoc/issues/58)) ([98bef94](https://github.com/meetKazuki/infra-stackdoc/commit/98bef944b11c9761d1f636da38c0fe67a823c26e))


### Documentation

* update README.md ([#61](https://github.com/meetKazuki/infra-stackdoc/issues/61)) ([2a36070](https://github.com/meetKazuki/infra-stackdoc/commit/2a360700f2f34af461e58ddaea356219bf737d10))

## [0.4.0](https://github.com/meetKazuki/infra-stackdoc/compare/v0.3.0...v0.4.0) (2026-05-16)


### Features

* improve visuals across editor, configs, gallery & template ([#52](https://github.com/meetKazuki/infra-stackdoc/issues/52)) ([3493da9](https://github.com/meetKazuki/infra-stackdoc/commit/3493da9b1ccc8ddf629d2fe52df398d098025de1))

## [0.3.0](https://github.com/meetKazuki/infra-stackdoc/compare/v0.2.0...v0.3.0) (2026-05-15)


### Features

* release accumulated features from develop ([78aca1f](https://github.com/meetKazuki/infra-stackdoc/commit/78aca1f8f870e9261e384cf56a192333e24e4fe0))

## [0.2.0](https://github.com/meetKazuki/infra-stackdoc/compare/v0.1.0...v0.2.0) (2026-03-27)


### Features

* enhance visual layout ([#21](https://github.com/meetKazuki/infra-stackdoc/issues/21)) ([1b2418e](https://github.com/meetKazuki/infra-stackdoc/commit/1b2418ea6a5123be405f0ade1c49cc74678b538b))
* Merge New Changes ([#26](https://github.com/meetKazuki/infra-stackdoc/issues/26)) ([e9f2c33](https://github.com/meetKazuki/infra-stackdoc/commit/e9f2c331ab2fed2600f5b7e60b607bf28d575c02))

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
