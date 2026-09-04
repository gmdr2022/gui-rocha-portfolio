# Oceanic portal evolution — September 2026

## Scope and authority

This local implementation follows the consolidated product direction approved on 2026-09-04. The historical 2026-08-03 About/ocean plan was shipped in commit `5319b1dc`; it is not a requirement to undo subsequent editorial and navigation decisions.

The current owner's explicit decision supersedes the historical prohibition on particles. Preserve the authored work-map mural, all seven particles, the recursive navigation and both deck energy canvases. Do not replace them with a circular carousel.

Goal: a distinctive, fluid portal through spatial composition and meaningful response, not extra copy, imagery or constant animation. Keep the static architecture, local assets, factual localized content, existing URLs and privacy controls. New code and comments use English; visitor copy remains PT/EN/ES. This does not authorize a repository-wide language rewrite.

No new dependency, external service, telemetry, generated video, image replacement or framework migration is required. Publishing, committing and pushing are separate actions. They were not performed during the initial local implementation; the owner subsequently reviewed the local preview, accepted the visual result and explicitly authorized commit, push and deployment on 2026-09-04.

## Master queue and current disposition

| Priority | Item | Local disposition | Acceptance boundary |
| --- | --- | --- | --- |
| P0 | Protect the authored signature | Preserved in source and regression coverage | Mural, seven particles and two energy canvases remain intact |
| P1 | Ocean Atmosphere v2 | Implemented | Theme-specific perceptual gain; visible-section state; bounded pointer response; no idle JS loop |
| P1 | Mobile first-visit consent | Implemented | Compact copy; equal-weight choices; details and storage behavior preserved |
| P2 | Spatial decision current | Implemented | Four ordered anchors in a curved current on wide layouts, linear reading on smaller containers |
| P2 | Project orbit | Implemented as the local visual candidate | Replaces only the dot selector; existing deck and single state owner preserved |
| P3 | Case reading lens | Implemented with factual scope | Explicit summary-to-tab relationships only; gallery remains independent |
| P4 | Contact signals | Implemented | Direct links; focus/hover parity; no fake availability signal; contextual channel retained |
| P5 | Editorial hero differentiation | Applied only to Contact | Preserve already distinctive About, Projects and Sites compositions |
| Cross-cutting | Automated proof and independent review | Passed locally | 81 passed, 12 intentional engine-specific skips; no failures or flaky results; two focused independent static reviews |
| Human gate | Visual impact, real browser zoom and assistive technology | Owner accepted the local visual result and authorized release | Actual browser zoom and screen-reader testing are not independently confirmed; automated checks do not replace them |

## Interaction contracts

### Atmosphere

- `site.js` owns the global ocean state. It validates color channels, source, index and ID before consuming `portal:ambientchange`.
- Sections are selected by distance to a reading line at 46% of the viewport, not by ratios of unequal section heights. Initial state comes from visible content.
- Components may send an `element` and `interactive` flag. Hidden initialization is cached; explicit input in a visible adjacent section takes precedence until the next scroll. Geometry-only updates preserve that choice while the section remains visible. Each section remembers its last semantic selection.
- A fixed, non-interactive background layer combines broad color and a secondary highlight. Dark and light themes have separate perceptual gains. Surface panels remain legible and opaque.
- Mouse input is normalized and bounded to +/-4% horizontally and +/-3% vertically. Input schedules one frame; CSS settles the transform. No continuously rescheduled animation frame is introduced.
- Coarse pointer, forced colors, reduced motion and hidden documents disable pointer movement. Forced colors removes only the ambient background layer, not navigation.

### Decision current and orbit

- The current preserves the four-step ordered list and anchor targets. Keyboard state and ambient color are updated together. Initialization does not emit an invisible step into the hero.
- The orbital selector reuses `applyActiveProject()` for card, URL, language links, counter, announcements and energy state. It never owns a second project index.
- Rotation accumulates the shortest signed angular delta. CSS custom properties and trigonometry distribute upright buttons around an ellipse only when the container is wide enough.
- Small containers and unsupported CSS retain a linear/wrapped selector. No autoplay, extra canvas, global rotation variable or permanent `will-change` is added.
- Reduced motion changes selection without the orbital journey. The original no-JavaScript project links remain the fallback.

### Reading lens and contact

- `caseSummaryFor()` retains its existing editorial source keys. Only `tab:<id>` entries become links into the corresponding panel. No image-to-facet relationship is inferred.
- `activateTab()` remains the single tab controller; `showGalleryItem()` remains the single gallery controller. Single-image cases remain static. Hashes use real `panel-<id>` targets and legacy tab hashes remain readable.
- Tab orientation follows the actual responsive layout, including keyboard axis. Shared generator helpers prevent divergent project/site-case markup.
- Contact preserves existing destinations and localized query context. Light represents current interaction, never live availability. Leaving the channel restores the relevant context color.

## Verification and visual review

Canonical verification commands:

```powershell
npm.cmd run check
npx.cmd playwright test tests/ocean-evolution.spec.mjs
npx.cmd playwright test tests/portal.spec.mjs
git diff --check
```

`PORTAL_BASE_URL` can point the browser suite at an already-running local preview. `PORTAL_CAPTURE_DESIGN=1` records optional design captures under the ignored `output/playwright/` directory. It is test-only and is not shipped.

Focused coverage includes both theme gains, pointer bounds, invalid ambient events, visible section selection, reduced motion/forced colors, decision keyboard state, shortest orbital rotation, consent actions and persistence in all three languages, viewport bounds, case-source links, independent gallery state, direct contact links, no-JavaScript content and system theme changes.

### Executed evidence — 2026-09-04

- `npm.cmd run check`: passed; 42 localized pages generated and validated; static build completed with 100 files, 16.99 MiB.
- Full browser suite: **81 passed, 12 skipped, 0 failed, 0 flaky**, across Chromium, Firefox and WebKit in 10.2 minutes. The 12 existing skips avoid duplicating six Chromium-only geometric/legacy-API scenarios in the other engines. None of the 30 new scenario/engine combinations was skipped.
- Full-suite invocation used the local server already running at port 4173:

```powershell
$env:PORTAL_BASE_URL = 'http://127.0.0.1:4173'
$env:PORTAL_CAPTURE_DESIGN = '1'
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = 'output/playwright/full-evolution-results.json'
npx.cmd playwright test --reporter=line,json
```

- `git diff --check`: passed. Independent static reviews covered ambient state, responsive fallbacks, case contracts and contact behavior. Findings were corrected before the final suite.
- Browser checks covered widths 320, 375, 768, 1440 and 1920, touch, keyboard, no JavaScript, reduced motion, forced colors, themes and localized consent. Existing automated WCAG A/AA checks passed; this is not a claim of complete accessibility conformance.
- Idle sampling confirmed that the new ambient input frame counter stopped advancing in all three engines. The local Chromium sample recorded cumulative layout shift 0.04456 and no long-task entries. Unsupported metrics in other engines are not evidence of zero; this short sample is not a full performance audit or field measurement.
- Text enlargement to 200% retained navigation in the tested routes. Actual browser zoom and a real screen reader remain human acceptance tasks.
- No content dataset, image source, package manifest or lockfile changed. The approximate 4.3 KB gzip increase refers only to the combined changed CSS/JS, not the entire page transfer.
- At the initial local handoff, Git remained on `main` at `cc7bb8195c6daac8fa9a304e62d3e351de94fca7`, with this slice uncommitted. No push or deployment had been performed at that point.

Visual acceptance remains separate: compare the dark and light atmosphere during scroll and pointer movement; assess whether the orbital control improves project discovery; confirm the current communicates sequence; use actual browser zoom at 200% and a real screen reader. Preserve static access when motion is reduced.

The Codex Checkpoint card is **Validar evolução oceânica do portal**, with stable key `sites.gui-rocha.ocean-evolution-202609.visual`. The owner's subsequent message accepted the local visual result and separately authorized publication; it does not prove that every assistive-technology check in the card was executed.

To inspect the implementation after the temporary QA server is stopped, run this command from the repository root and open the local address printed by the server:

```powershell
npm.cmd run serve
```

The preview is local and requires that process to remain running. It is not a deployed website.

## Recovery and continuation

Changes are confined to canonical CSS/JS, the generator, validation/tests and their generated public pages. No content dataset or image source was replaced. The pre-existing untracked `reports/` directory is unrelated and must remain untouched.

For rollback, reverse only this reviewed slice in the canonical sources and regenerate with `npm.cmd run check`; do not reset the worktree or hand-edit generated HTML.

## Authorized release

The release target is the existing `gmdr2022/gui-rocha-portfolio` repository, production branch `main`, and its existing Cloudflare Pages project `gui-rocha`. Do not change DNS, account permissions, build integration or dependencies. The Git-integrated deployment should publish the same commit accepted by GitHub Quality; verify the official domain and the immutable deployment URL against the local build.

The pre-release baseline is commit `cc7bb8195c6daac8fa9a304e62d3e351de94fca7`, Cloudflare deployment `ffeda6c0-6eae-44d0-bc5e-96e33d6da6ac`, immutable URL `https://ffeda6c0.gui-rocha.pages.dev`. If critical navigation fails, runtime errors occur, public asset hashes diverge or security headers disappear, stop the release and restore that successful production deployment through Cloudflare Pages rollback. Reconcile source afterward with a reviewed revert commit, never a force push.

Publication completion requires the actual commit/push result, same-commit CI and deployment success, public HTTP/hash/header checks and a focused browser smoke. Record the resulting immutable identifiers in the release handoff; authorization alone is not publication evidence.

### Initial publication and browser-test hardening

Commit `20296cdfc4d7fc6908e8e1c658a4d8a0f1dc1763` was pushed to `main` and deployed as `db91aa63-093b-4284-8e39-8d202d2fc46b`. GitHub Quality run `33891185521` passed with 81 tests and 12 expected skips. HTTP checks confirmed 47 route/asset hashes against the local build on both the official domain and the immutable deployment URL, along with security headers, private-route/404 protection and a query-preserving redirect.

The first production browser smoke exposed a test-precondition race, not an incorrect channel response: WebKit changed scroll position from 342 to 136 after calculating hover coordinates, leaving the pointer over GitHub instead of ClubAL. Disabling focus scrolling alone was insufficient; a second trace showed the hover command itself changing scroll from 197 to 395 after calculating its pointer position. The contact test now sets focus without scrolling, explicitly positions the target, waits two rendering frames and verifies actual `:hover` before testing blur persistence. It retains all original state, destination and leave/reset assertions, adds no retry or timeout budget, and changes no shipped CSS, JavaScript or content. Three repetitions per engine then passed in production: 9/9, covering three contact contexts per repetition.

### Gallery resize regression

The follow-up CI run `33892288488` exposed a separate atmospheric-state issue after a gallery image change. Instrumentation showed `gallery-1/mid` followed by a `ResizeObserver` notification for the visual column, then a different section's cached state, with `scrollY` unchanged. The first and second ClubAL images have different aspect ratios, so a resize is expected. The geometry callback incorrectly released an explicit selection as if new navigation had occurred.

The fix retains the explicit section while it remains visible, releases it on subsequent scroll or when it leaves the viewport, and does not introduce timers, animation loops, dependencies or visual replacements. A new regression failed before the fix in Chromium with unchanged scroll position; it now checks the exact gallery ID/depth after image decode and layout, followed by return to surface state after real scroll. Case interaction tests also explicitly settle pointer targets to separate native scroll completion from input coordinates, and assert the gallery ID rather than merely accepting any evidence source.

After the correction, two repetitions of the reading-lens flow and resize regression passed in each engine (12/12). The complete evolution suite then passed locally in Chromium, Firefox and WebKit (33/33, no skips or retries, 2.2 minutes). `npm.cmd run check` and `git diff --check` also passed. These results are local proof; final same-commit CI and production receipts belong to the release handoff.
