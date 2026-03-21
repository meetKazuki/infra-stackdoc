# Branch & Release Strategy

## Branch Model

```
feature/*  ──PR──▶  develop  ──PR──▶  master  ──tag──▶  GHCR
                       │                  │
                       │                  ├── release-please opens PR
                       │                  ├── merge → auto-tag (v0.2.0)
                       │                  └── release.yml → validate + publish
                       │
                   CI runs on every PR
                   (Typecheck, Build, Test)
```

### `develop` (default branch)

The integration branch. All feature work lands here via pull request. CI must pass before merge.

Coolify does **not** deploy from `develop`. This is the working branch, not the production branch.

### `master` (production)

Represents what is deployed to production. Only updated via pull requests from `develop`.

When code lands on `master`, two things happen:

1. **Coolify auto-deploys** the new state to `stackdoc.kazuki.uk`.
2. **Release Please** analyses the commit messages and either creates or updates a release PR with the appropriate version bump and changelog entries.

When the release PR is merged, Release Please tags the commit (e.g., `v0.2.0`) and creates a GitHub Release. The tag triggers `release.yml`, which validates the build and publishes a Docker image to GHCR.

### Feature branches

Branch off `develop`, open a PR back to `develop`. Naming convention is loose — `feature/`, `fix/`, `chore/` prefixes are encouraged but not enforced. Use Conventional Commits for messages so Release Please can determine version bumps automatically.

## Conventional Commits

Release Please reads commit messages to decide version bumps and generate changelogs. Follow this format:

```
<type>: <description>

# Examples:
feat: add VLAN node type
fix: handle empty YAML gracefully
feat!: restructure PositionedGraph output
docs: update README
ci: add test job to pipeline
chore: bump dependencies
refactor: simplify layout engine
```

| Prefix | Version bump | Appears in changelog |
|--------|-------------|---------------------|
| `feat:` | PATCH (pre-v1), MINOR (post-v1) | Yes, under "Features" |
| `fix:` | PATCH | Yes, under "Bug Fixes" |
| `perf:` | PATCH | Yes, under "Performance" |
| `feat!:` or `BREAKING CHANGE:` | MINOR (pre-v1), MAJOR (post-v1) | Yes |
| `docs:`, `chore:`, `ci:`, `test:`, `refactor:` | No release | No (hidden) |

While we are pre-`v1.0.0`, `feat:` bumps the patch version, not the minor. This prevents rapid minor version inflation during early development.

## Release Process

Releases are automated via Release Please. You do not manually tag releases.

### Cutting a release

1. Merge feature PRs into `develop` using conventional commit messages.
2. Open a PR from `develop` → `master`. Review the diff, ensure CI passes, merge.
3. Release Please opens (or updates) a release PR on `master` with:
   - Version bump in `package.json` and the manifest
   - Updated `CHANGELOG.md`
4. Review the release PR. Merge it when you're ready to publish.
5. Release Please creates the tag and GitHub Release automatically.
6. `release.yml` triggers: validates the tag, builds the Docker image, pushes to GHCR.

### Post-release sync

After every release, merge `master` back into `develop` to keep the branches in sync. Release Please creates commits on `master` (changelog, version bumps) that need to flow back to `develop`.

```bash
git checkout develop
git pull origin develop
git checkout -b chore/sync-master-to-develop
git merge origin/master
# Resolve any conflicts (usually CHANGELOG.md)
git push -u origin chore/sync-master-to-develop
```

Open a PR from `chore/sync-master-to-develop` → `develop`, let CI pass, and merge.

> **Important:** Do not skip this step. If `master` and `develop` diverge, the next release PR will show merge conflicts.

## CI Pipeline

| Trigger | Workflow | Jobs |
|---------|----------|------|
| PR to `develop` or `master` | `ci.yml` | Typecheck, Build, Test |
| Push to `develop` or `master` | `ci.yml` | Typecheck, Build, Test |
| Push to `master` | `release-please.yml` | Create/update release PR |
| Tag `v*.*.*` | `release.yml` | Validate, Publish to GHCR |

All three CI jobs (Typecheck, Build, Test) run in parallel for fast feedback.

### Workflow files

```
.github/
├── actions/
│   └── setup-repo/
│       └── action.yml          ← Composite: pnpm 8.6.1 + Node 20 + frozen install
└── workflows/
    ├── ci.yml                  ← Quality gates on every PR/push
    ├── release.yml             ← Tag-triggered: validate + publish Docker to GHCR
    └── release-please.yml      ← Automated versioning + changelog on master
```

## Branch Rulesets

Configured in **GitHub → Settings → Rules → Rulesets**.

> **Note:** Rulesets are only enforced on public repos (free plan) or GitHub Team orgs. The repo is now public, so these are active.

### `protect-develop`

| Setting | Value |
|---------|-------|
| Enforcement status | Active |
| Target branches | `develop` |
| Restrict deletions | On |
| Require a pull request before merging | On |
| Required approvals | 0 (solo dev) |
| Require status checks to pass | On |
| Required checks | `Typecheck`, `Build`, `Test` |
| Block force pushes | On |

### `protect-master`

| Setting | Value |
|---------|-------|
| Enforcement status | Active |
| Target branches | `master` |
| Restrict deletions | On |
| Require a pull request before merging | On |
| Required approvals | 0 (solo dev) |
| Require status checks to pass | On |
| Required checks | `Typecheck`, `Build`, `Test` |
| Block force pushes | On |

> **Note:** The required check names (`Typecheck`, `Build`, `Test`) must match the `name:` field in `ci.yml` exactly. GitHub won't find them until the workflow has run at least once on the branch.

## Docker & GHCR

On every tagged release, `release.yml` builds the Docker image and pushes it to GitHub Container Registry with three tags:

- Full semver: `ghcr.io/meetkazuki/infra-stackdoc:0.2.0`
- Major.minor: `ghcr.io/meetkazuki/infra-stackdoc:0.2`
- Latest: `ghcr.io/meetkazuki/infra-stackdoc:latest`

The image includes a `HEALTHCHECK` instruction and nginx security headers (CSP, HSTS, X-Frame-Options, etc.).

See [COOLIFY-GHCR.md](./COOLIFY-GHCR.md) for instructions on switching Coolify to pull pre-built images from GHCR.
