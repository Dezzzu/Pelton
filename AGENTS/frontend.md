# Frontend (Svelte 5 + TypeScript)

Read this before touching `frontend/`. See also [design-tokens.md](design-tokens.md)
for UI/CSS rules, which apply to everything in `src/components`.

## Layout

- `src/components/` — feature subfolders: `sidebar`, `settings`, `compose`,
  `wizard`, `common`, `detail`, `list`, `onboarding`.
- `src/stores/` — app state.
- `src/theme/` — design tokens and theme/accent logic.
- `src/lib/` — Wails API bindings, locales.

## Wails bindings

`frontend/wailsjs/` is maintained by hand, but `wails generate module` rewrites
it whenever it runs, so matching what the generator emits is not a style
preference. Anything written differently is rewritten by the next person who
runs it, and lands in their diff as churn that has nothing to do with their
change.

The detail that keeps getting missed is blank lines. In `go/models.ts` a blank
line inside a namespace or a class is a single tab, not an empty line; only the
lines separating one namespace from the next are truly empty. After adding a
DTO by hand, `grep -nP '^$' frontend/wailsjs/go/models.ts` should still match
nothing but those namespace boundaries.

`go/desktop/App.js` and `App.d.ts` have no nesting and use empty lines
throughout, so they need no such care.

## Docstrings

Every exported function, exported type/interface, and public component prop
gets a short doc comment: JSDoc-style `/** ... */` for functions/types, a
comment above `export let` / `$props()` fields for component props. Internal,
unexported helpers only need one if genuinely non-obvious. Keep it short and
factual, don't restate the signature in prose.

## Localization

UI strings live in `src/lib/locales/{en,de,fr,nl,es}.ts`. Adding user-facing
text means adding the key to all five locale files. English is the source of
truth; other languages can be a reasonable best-effort translation, flag it
if you're unsure of the translation.

## Testing

`pnpm run check` (svelte-check) must pass. There's no significant frontend
test suite yet; when touching UI logic, verify manually via `make run`
before calling a change done (a separate `PELTON_DEV` data dir is used
automatically so this never touches a real install's accounts/mail/settings).
