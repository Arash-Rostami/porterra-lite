# Next.js Performance (Next.js / React — App Router)

Genuinely complementary practices for this stack. Project pattern docs override anything here. North star: minimality, creativity, performance — smallest change, same result.

**Data fetching**
- Parallelize independent reads (`Promise.all`), never sequential `await` chains a compiler cannot overlap.
- Fetch at the lowest component that owns the data; pass results down. Do not re-fetch upward in layout + page + child.
- Server Components by default; push `'use client'` to the leaves that need interaction — each client boundary ships JS and blocks hydration.
- Cache deliberately: `cache()` for request-scoped dedup, `revalidate`/tags for durable — but never cache beyond user-visible freshness needs.

**Rendering**
- Avoid per-request work in the root layout (it re-renders on every route of its segment).
- Prefer static rendering (`export const dynamic = 'error'` default path) where data allows; isolate the dynamic slice to the smallest segment (`dynamic = 'force-dynamic'` on the leaf, not the layout).
- Lists need stable `key`s; avoid composing state from derived arrays every render (useMemo only when measured, not ritual).

**Client JS**
- Dynamic-import heavy, powder-show components (`next/dynamic`) — charts, editors, maps.
- Never import a server-only SDK into a client component. Check `'use client'` file imports for accidental barrel pulls (`@/lib` index re-exports drag whole trees in).
- Images: `next/image` with explicit `sizes`; lazy `iframe`s; fonts via `next/font`.

**Server runtime**
- No secrets in `'use client'` modules or NEXT_PUBLIC vars; env needed client-side must be non-sensitive by definition.
- Middleware/logs stay thin — hot path on every request.
- DB: parameterized queries, indexes for filter/sort columns, no N+1 inside `.map()` loaders.

**React correctness-as-performance**
- Effects only for true external sync; derived state stays derived (no set-effect cascades).
- Keyboard/aria completeness on interactive elements; update URLs for shareable state.