# Dependency security review — 2026-11-02

This is a point-in-time npm registry audit, not proof of absence of risk. Run
`npm audit --json`, `npm audit`, `npm audit --omit=dev`, and `npm explain <name>`
after dependency changes. CI saves the complete JSON as `npm-audit-report` and
emits its totals as a warning; findings are **not** a passing security gate.
Registry/report failures still fail that step. See follow-up
[#4](https://github.com/anassan05/campusconnect/issues/4) before production.

## Manifest and safe remediation

The original lock root incorrectly listed unused direct `bcryptjs`, `next-auth`,
`zod`, `@testing-library/jest-dom`, `@testing-library/react`, `@types/bcryptjs`
and `tsx`. No current source or scripts use them. The synchronized lock root
matches `package.json`; the first six and their no-longer-needed dependencies
were removed. `tsx` is **retained** as an optional peer transitive dependency:
`tailwindcss@3.4.19 -> postcss-load-config@6.0.1 -> tsx@4.23.15`.
No direct authentication packages were added.

The original Next 15.5.28 pinned `postcss@8.4.31`. A scoped npm override selects
`postcss@8.5.32` for Next, the same patched major already used by the direct dev
PostCSS dependency. This replaces the nested 8.4.31 copy (GHSA-6g55-p6wh-862q,
GHSA-r28c-9q8g-f849 and other PostCSS advisories in the before audit). Next
itself and other locked versions were not upgraded. This override goes beyond
Next's exact upstream pin and has only the tests/build coverage described in the
status; reassess against an upstream-compatible release. Bundled code and all
possible application paths have not been exhaustively audited.

Before synchronization `npm audit` reported **26** vulnerable packages: 18
moderate, 6 high, 2 critical. After synchronization alone: **25** (18 moderate,
5 high, 2 critical). After the PostCSS override: **23** (17 moderate, 4 high,
2 critical). `npm audit --omit=dev` still reports **3 high**, all the Prisma
chain below, and no moderate/critical. A clean production-only installation in a
scratch directory confirmed that npm installs Prisma via an optional peer of the
production client. These counts aggregate affected packages as well as root
advisories, so do not count them as 23 distinct advisories.

## Remaining critical/high: paths, exposure and fixes

Versions and paths below were checked with `npm explain`; ranges are the npm
audit aggregate range or advisory-specific range as indicated. Fix availability
means a package is published, not that it is safe to apply without migration.

| Affected package (installed, directness; npm aggregate range) | Exact dependency path and advisory | Exposure, fix and mitigation |
|---|---|---|
| `prisma@6.19.3` (direct dev; `6.13.0-dev.1 - 7.10.0 || 8.0.0-rc.3 - 8.1.0-dev.4`); `@prisma/config@6.19.3` (transitive; `6.13.0-dev.1 - 7.10.0 || 8.1.0-dev.1 - 8.1.0-dev.4`); `deepmerge-ts@7.1.5` (transitive; `<8.0.0`) | `prisma -> @prisma/config -> deepmerge-ts`; also `@prisma/client` (production direct) -> optional peer `prisma` -> same chain. The high finding is [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), stack exhaustion with recursive graphs; the two parent entries are aggregate reports of that advisory, not separate CVEs. | npm includes this chain in `--omit=dev` and it was present in a clean omit-dev install. Exposure is Prisma CLI/config processing, including CI; do not accept untrusted config or recursive merge inputs. `deepmerge-ts@8.0.2` and Prisma/config 7.10.1 exist, but Prisma 6.19.3 pins 7.1.5; migration to Prisma 7 is a breaking major change requiring aligned client/migration review. Although npm says `fixAvailable: true`, a non-force `npm audit fix --package-lock-only --ignore-scripts` in a disposable copy changed no versions and left this finding. No compatible non-breaking fix was established. |
| `tinypool@1.1.1` (transitive dev; `<=2.1.1`) | `vitest@2.1.9 -> tinypool@1.1.1`. Critical [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) (`<=2.1.0`) and [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) (`<2.1.2`): prototype pollution gadgets can lead to RCE. | Test workers execute in CI/dev, not an app dependency by declaration; current Dockerfile copies build `node_modules` to runner, so they may be present in the image. Avoid untrusted test/config input and isolate CI. Patched `tinypool@2.1.2` exists but is outside Vitest 2's `^1.0.1`; npm proposes Vitest 5.0.5, a breaking major. |
| `vitest@2.1.9` (direct dev; `<=4.1.10`) | Direct `vitest`; [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp) (`<3.2.6`) allows arbitrary file read/execution when the Vitest UI server is listening; also aggregates the tinypool criticals above. | CI executes `vitest run`, not the UI; do not expose the UI to untrusted networks. Dev/CI code still runs with the runner's access. Patched Vitest exists, but npm's full fix is 5.0.5, a breaking upgrade; review it separately. |
| `vite@5.4.21` (transitive dev; `<=6.4.3`) | `vitest@2.1.9 -> vite@5.4.21`; `vitest -> vite-node@2.1.9 -> vite`; `@vitejs/plugin-react@4.7.0 -> peer vite`. High [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) (`<=6.4.3`) affects Windows launch-editor existence checks. | Dev/test tooling executes locally/CI; avoid exposing dev servers or processing untrusted editor paths, especially on Windows. Vite 6.4.4 exists but Vitest 2 requires `^5.0.0`; npm proposes breaking Vitest 5.0.5. Other Vite moderate/low advisories appear in the full audit artifact. |

No major upgrades or `npm audit fix --force` were applied. Follow-up #4 tracks
review of Prisma, Vitest/Vite and image contents. Mitigations are not fixes.

## Remaining moderate families

The full JSON artifact lists every affected package, advisory and node path.
The direct advisory families and representative `npm explain` paths are:

- [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)
  minimatch glob amplification: `eslint -> minimatch@3.1.5`,
  `@eslint/eslintrc -> minimatch@3.1.5`, and
  `eslint-config-next -> @typescript-eslint/parser ->
  @typescript-eslint/typescript-estree -> minimatch` (also eslint plugin/config
  paths). These are lint/dev tools, but lint executes in CI. Avoid untrusted glob
  patterns; test compatible lint-stack updates in #4.
- [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99):
  `vitest -> vite -> esbuild@0.21.5`; do not expose development servers.
- [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)
  and [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8):
  `vitest -> @vitest/mocker@2.1.9`; restrict untrusted test/mock input.
- Vite itself has additional moderate/low advisories shown in the audit artifact;
  the paths and development-server cautions are in the table above.
