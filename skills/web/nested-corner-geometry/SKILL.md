---
name: nested-corner-geometry
description: Geometry rule for children placed near the inside edge or corner of a rounded container. Two constraints apply together — (1) the child's gap to each adjacent container edge should be equal (or match the container's content padding on each axis), and (2) when both child and parent are rounded, the child's corner radius should be concentric with the parent's via `r_inner = r_outer − inset_gap`, falling to 0 (square) when the difference is non-positive. Use when designing or reviewing cards / panels / sheets / modals whose interior holds buttons, pills, badges, icons, avatars, or smaller cards in or near a corner — even when the user only says "the button looks off" or "the corner feels weird" without naming geometry.
---

# Nested Corner Geometry

Two geometric rules that apply together whenever a child element sits in or near the corner of a rounded container.

## Rule 1 — Equal insets on adjacent edges

When a child approaches a corner of its parent, its distance to each of the two adjacent parent edges should be **the same value**, not whatever each `mb-*` / `mr-*` happened to be. The eye reads asymmetric insets as "the element is sliding off one side".

If the parent has different content paddings per axis (`px-6 py-4` is common in cards), the equal-inset rule applies to the **inner content frame**, not to the raw container edges. A CTA at the bottom-left should have its left edge aligned with where other text starts (i.e., the left content edge) **and** be the same distance from the bottom content edge as it is from that left content edge.

For a child near just one edge (no corner involvement), the simpler rule applies: the gap to that edge should equal the gap any sibling content has — i.e., match the container's content padding on that axis. Don't invent a new gap value.

## Rule 2 — Concentric corner radii

When both child and parent are rounded, the child's corner radius should be **the parent's radius minus the gap between them**:

```
r_inner = r_outer − inset_gap
```

If `r_outer − inset_gap ≤ 0`, the child should have **square corners** (no rounding). A tiny positive radius (1-2 px) reads worse than zero — the eye notices a curve too tight for the parent.

The rule produces visually parallel curves between the two rounded shapes — what the eye recognises as "tucked into the corner cleanly". The same principle that makes nested phone screen masks and OS window chrome feel right.

For a circle / pill inside a rounded container, the inscribed circle's radius matters: when the pill's height plus 2×inset_gap exceeds 2×r_outer, the pill's outer arc bulges past the container's inner arc envelope and the corner looks pinched. Either reduce pill height, increase inset, or use a smaller parent radius.

## Pattern A — CTA tucked into a card corner

Card has `rounded-2xl` (`r_outer = 16px`) and `px-6 py-5` (content padding 24 / 20). A "Show more" link sits at the bottom-left, just inside the card.

```tsx
// ❌ Mismatched insets, hardcoded child radius
<article className="rounded-2xl px-6 py-5">
  <h2>News</h2>
  <ul>{items}</ul>
  <button className="mt-3 ml-0 mb-0 rounded-md px-3 py-2">Show one more →</button>
</article>

// ✅ Equal inset on bottom + left edges of content frame; child radius unset (parent's 16 − 12 inset = 4, or just leave square)
<article className="flex flex-col gap-3 rounded-2xl p-3 sm:p-4">
  <div className="px-3 py-2">
    <h2>News</h2>
    <ul>{items}</ul>
  </div>
  <button className="rounded-lg px-3 py-2 text-left">Show one more →</button>
</article>
```

The key shift: stop using the card as the direct positional context and let an inner flex layout carry the rhythm. The CTA's `px-3 py-2` matches the inner content block's padding so visual gaps line up.

## Pattern B — Pill inside a pill-shaped container

A status pill (`rounded-full`, height ~24 px) embedded into a card with `rounded-3xl` (24 px). Inset gap 12 px → `r_inner = 24 − 12 = 12 px`. Use `rounded-xl` (12 px) on the pill, not `rounded-full`, otherwise the pill's tight curve clashes optically with the card's gentler curve.

Exception: when the pill is small relative to the card and far from any corner (e.g., dead-centre), `rounded-full` is fine — concentricity only matters near the corner where the two curves are visible together.

## Pattern C — Avatar / circle near a card corner

A round avatar in the top-right of a card:

```
inset_gap = max(horizontal, vertical) = 16 px
r_outer = 16 px
r_inner-equivalent = 16 − 16 = 0
```

Since the avatar's centre lies further from the corner than the parent's radius, the avatar is fully outside the parent's corner curvature, so concentricity is moot — only Rule 1 (equal insets) applies. If the avatar's diameter is bigger than `2 × inset_gap`, parts of it would clip the parent's corner arc; check whether the avatar's outline ever crosses the rounded corner's curve and back off the inset if so.

## Diagnostic checklist

When something in a corner looks off but you can't pin it:

1. Measure the gap from the child's visible edge to each adjacent inner content edge of the parent. Are they equal?
2. If both are rounded: is `r_inner` equal to `r_outer − inset_gap`?
3. If `r_outer − inset_gap` is small (< 4 px), is `r_inner` set to **zero** instead of trying to be "a little bit rounded"?
4. Does the child's own padding match the rhythm of the parent's content padding? A `px-3 py-2` button next to a `px-6` heading creates a visible step the eye reads as misalignment.

## Anti-patterns

- **Mismatched margins at corners** — `mt-3 mb-1` or `ml-4 mr-2` for an element that visually sits near a corner. If the design wants asymmetric, set the asymmetry deliberately at the parent layout level, not via random child margins.
- **Hardcoded child radius regardless of context** — `rounded-md` (6 px) on every button. Inside a `rounded-2xl` card with inset 8 px, the concentric value would be 8 px (`rounded-lg`). Use a token / variable that scales with the parent.
- **Tiny non-zero child radius near a square-edge limit** — when the math says `r_outer − inset ≤ 2 px`, snapping to `rounded-sm` is wrong. Use zero.
- **`rounded-full` on a pill that's too tall** — if the pill's height ≥ `2 × inset_gap` near a corner, the pill's perfect circle on the cap clips the parent's rounded corner geometry. Use a smaller corner radius matching `r_outer − inset_gap`.

## When NOT to apply

- **Child in the middle of the container**, with no corner or edge nearby — concentricity is moot, equal-insets simplifies to "follow content rhythm".
- **Sharp-cornered (rectangular) containers** — Rule 2 doesn't apply; only Rule 1 (equal insets).
- **Visually distinct visual layer** (e.g., a floating overlay or a popover anchored to a corner with deliberate offset) — these are positioned by design, not by content rhythm.
