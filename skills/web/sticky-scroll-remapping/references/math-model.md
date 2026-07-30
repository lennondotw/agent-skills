# Sticky Scroll Remapping Math Model

## Geometry

Let:

- `V` be viewport height;
- `H` be sticky-layer height;
- `L` be outer section height;
- `P = L - H` be the native pinned plateau distance;
- `u` be input scroll distance measured from when the section starts entering the viewport;
- `T = V + L` be the complete entry-through-exit input interval.

Clamp only where the visual projection requires a finite interval. Keep unclamped progress available
for effects whose initial state begins before `0` or whose final state settles after `1`.

## Native Sticky Displacement

Native sticky displacement through the viewport is:

```text
                 u                         0 <= u <= V
d_native(u) =    V                         V < u <= V + P
                 u - P                     V + P < u <= T
```

Its velocity is piecewise:

```text
v_native(u) = 1, 0, 1
```

The position function is continuous, but its first derivative is not. In animation language this is
a velocity corner. In geometry it is a kink; reserve "cusp" for a sharper singular tangent case.

## Curve Orders

### Direct Position Easing

For normalized `t`:

```text
linear(t)       = t
smoothstep(t)   = 3t^2 - 2t^3
smootherstep(t) = 6t^5 - 15t^4 + 10t^3
```

- Cubic smoothstep has zero first derivative at both endpoints, so direct position joins with
  continuous velocity.
- Quintic smootherstep also has zero second derivative at both endpoints, so direct position joins
  with continuous acceleration.

### Smoothing Velocity Instead Of Position

Sticky's defect is a velocity step. Define the transition in velocity, then integrate it into
position. Integrating adds one continuity order to displacement.

The integral of quintic smootherstep is:

```text
I(t) = t^6 - 3t^5 + 2.5t^4
```

For transition distance `D` and drift velocity `v_d`:

```text
entryTransition(t) = D * [t + (v_d - 1) * I(t)]
exitTransition(t)  = D * [v_d * t + (1 - v_d) * I(t)]
```

The entry derivative moves from `1` to `v_d`. The exit derivative moves from `v_d` to `1`. Because
quintic smootherstep's first two derivatives vanish at its endpoints, these transitions join the
constant-velocity regions without visible velocity or acceleration corners.

## Drift And Area Conservation

A non-zero drift adds displacement during the interval where native sticky would be stationary. To
finish at the native endpoint, recover the same distance by shortening the leading and trailing
full-speed regions.

One practical parameterization is:

```text
equivalentLowVelocityDistance = P / (1 - v_d)
D = min(
  V * transitionViewportRatio,
  equivalentLowVelocityDistance * transitionLowRegionRatio
)
driftDistance = equivalentLowVelocityDistance - D
```

The outer full-speed distance must be reduced by:

```text
outerDistanceReduction = P * v_d / (1 - v_d) + D
outerDistance = V + H
outerDistanceScale = max(0, 1 - outerDistanceReduction / outerDistance)
leadingDistance = V * outerDistanceScale
trailingDistance = H * outerDistanceScale
```

This preserves asymmetric viewport/sticky geometries by reducing the two outer regions in proportion
to their native lengths.

## Parameter Feasibility

Let the combined native full-speed distance be:

```text
O = V + H
```

Drift consumes this much outer distance before transitions are allocated:

```text
R = P * v_d / (1 - v_d)
```

A feasible profile requires `R < O`. Equivalently:

```text
v_d < O / (P + O)
```

After choosing a feasible drift, transition distance must also satisfy:

```text
D <= O - R
```

Use the available distance as an additional transition cap:

```text
availableTransitionDistance = max(0, O - R)
D = min(
  V * transitionViewportRatio,
  equivalentLowVelocityDistance * transitionLowRegionRatio,
  availableTransitionDistance
)
```

If requested drift violates the bound, either reject the configuration or clamp it below
`O / (P + O)` with an explicit transition reserve and expose the effective value in diagnostics. Do
not use only a floating-point epsilon as the reserve; that can leave a mathematically continuous but
sub-pixel transition that still looks like a hard corner. Merely clamping `outerDistanceScale` to zero
does not restore area conservation.

## Drift Is Velocity, Not Offset Amplitude

During the center interval:

```text
d_target(u + delta) - d_target(u) ~= v_d * delta
```

For downward page scrolling, the content's viewport `top` normally changes by approximately
`-v_d * delta`. A sine or `sin^2` compensation bump does not satisfy this: its derivative reaches zero
and changes sign, so the content stops and reverses even though the compensation itself remains
non-zero. Test midpoint slope, not midpoint offset.

## Compensation Transform

Let `d_target(u)` be the integrated remapped displacement. The visual compensation is:

```text
c(u) = d_native(u) - d_target(u)
```

Apply `c(u)` to the inner visual layer. The sign matters: compensation replaces the visual position
curve while native sticky remains responsible for layout.

Required invariants:

```text
c(0) = 0
c(T) = 0
d_target(0) = d_native(0)
d_target(T) = d_native(T)
```

The midpoint compensation may also be zero in symmetric geometry, but that is not a general endpoint
requirement.

## Emphasized Horizontal Easing

Direct quintic smootherstep may be mathematically smooth but visually subtle over a short horizontal
travel. Increase perceptual emphasis without changing endpoints:

```ts
const base = smootherstep(progress);
const emphasized = smootherstep(base);
const mapped = base + (emphasized - base) * emphasis;
```

For `emphasis` in `[0, 1]`:

- `0` is ordinary smootherstep;
- `1` is fully composed smootherstep;
- intermediate values extend both low-speed regions while preserving `0`, `0.5`, and `1`.

Do not use this emphasized mapping for the sticky compensation velocity profile. It is intended for a
nested direct-progress effect such as horizontal cards.

## Numerical Verification

For step `epsilon`, estimate velocity:

```text
v(p) ~= [d(p + epsilon) - d(p - epsilon)] / [2 * epsilon * T]
```

Sample densely across `[0, 1]` and compute the maximum adjacent velocity jump. Also sample each
piecewise boundary from both sides. A visually smooth graph can still hide an implementation branch
whose endpoints disagree by a small amount.
