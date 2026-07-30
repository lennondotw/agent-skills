# Motion React Implementation

## Keep Scroll Updates Outside React State

`MotionValue` updates bypass React reconciliation. Use them for all per-frame scroll values:

```tsx
const sectionTop = useMotionValue(0);
const sectionHeight = useMotionValue(0);
const stickyHeight = useMotionValue(0);
const viewportHeight = useMotionValue(0);
const { scrollY } = useScroll();

const compensationY = useTransform(() => {
  const totalInput = viewportHeight.get() + sectionHeight.get();
  if (totalInput <= 0) return 0;

  const progress = (scrollY.get() - (sectionTop.get() - viewportHeight.get())) / totalInput;

  return getStickyScrollCompensation(progress, {
    sectionHeight: sectionHeight.get(),
    stickyHeight: stickyHeight.get(),
    viewportHeight: viewportHeight.get(),
  });
});
```

Function-form `useTransform` tracks every MotionValue read through `.get()`. Do not mirror these values
into `useState` unless a low-frequency semantic UI value actually needs a React render.

## Wrapper Structure

```tsx
const StickyScrollRemap = ({ children, enabled = true }) => {
  const stickyRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  // MotionValues and compensationY omitted here; see the preceding section.

  useLayoutEffect(() => {
    const sticky = stickyRef.current;
    const section = sticky?.parentElement;
    if (!sticky || !section) return;

    const measure = () => {
      sectionTop.set(window.scrollY + section.getBoundingClientRect().top);
      sectionHeight.set(section.getBoundingClientRect().height);
      stickyHeight.set(sticky.getBoundingClientRect().height);
      viewportHeight.set(window.innerHeight);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(section);
    observer.observe(sticky);
    measure();

    return () => observer.disconnect();
  }, []);

  const y = useTransform(() => {
    if (!enabled || prefersReducedMotion) return 0;
    return compensationY.get();
  });

  return (
    <div ref={stickyRef} className="sticky top-0 h-dvh">
      <motion.div style={{ y, willChange: "transform" }}>{children}</motion.div>
    </div>
  );
};
```

The wrapper assumes its direct parent is the section track. If that contract is too implicit, pass an
explicit track ref instead.

## Responsive Horizontal Travel

Measure real content width and available content-box width:

```ts
const trackStyle = getComputedStyle(track);
const paddingInline = Number.parseFloat(trackStyle.paddingLeft)
  + Number.parseFloat(trackStyle.paddingRight);
const availableWidth = Math.max(0, track.clientWidth - paddingInline);
const travel = Math.max(0, content.getBoundingClientRect().width - availableWidth);

horizontalTravel.set(travel);
section.style.height = `${window.innerHeight + travel}px`;
```

The key invariant is that pinned distance equals actual overflow. At a wide breakpoint where content
fits, `travel` is zero and the section is exactly one viewport high. The sticky compensation function
then sees no plateau and returns zero.

## Horizontal Motion Graph

```tsx
const horizontalTravel = useMotionValue(0);
const { scrollYProgress } = useScroll({
  target: sectionRef,
  offset: ["start start", "end end"],
});

const mappedProgress = useTransform(() =>
  getEmphasizedSmootherstepProgress(scrollYProgress.get(), 0.6)
);
const x = useTransform(() => -mappedProgress.get() * horizontalTravel.get());

return <motion.div style={{ x }}>{cards}</motion.div>;
```

Keep horizontal progress independent from vertical compensation. The former maps the pinned interval;
the latter replaces the full entry-through-exit visual displacement curve.

## Resize Without A Hot Layout Loop

`ResizeObserver` catches content and border-box changes, but responsive padding can change while the
observed border-box remains constant. Add a cheap viewport-size guard:

```tsx
const lastViewport = useRef({ width: 0, height: 0 });

useAnimationFrame(() => {
  const next = { width: window.innerWidth, height: window.innerHeight };
  const previous = lastViewport.current;

  if (next.width === previous.width && next.height === previous.height) return;

  lastViewport.current = next;
  measureHorizontalLayout();
});
```

This runs a two-number comparison every frame but performs layout reads only when viewport dimensions
change. Keep `ResizeObserver` for content width changes caused by cards, fonts, or assets.

## Reduced Motion

Prefer native sticky with zero compensation when `useReducedMotion()` is true. Decide separately
whether nested horizontal travel should remain linear, become static, or use a non-pinned mobile
layout. Do not silently preserve a complex remapped trajectory under reduced motion.

## Debugging

Add page-anchored rulers on both sides of the document. Vary tick length, darkness, and labels so fast
scrolling does not create a uniform flicker pattern. The rulers expose native document displacement
while the remapped content moves on its compensation curve.

In DevTools inspect both layers:

- sticky anchor: should retain native sticky layout and no compensation transform;
- inner remap layer: should receive `translateY`;
- horizontal track: should receive an independent `translateX`;
- outer section: should own only the computed scroll height.

To verify drift semantics, sample the visual layer at `centerScroll - delta` and
`centerScroll + delta`:

```text
visualVelocity ~= [top(center + delta) - top(center - delta)] / (2 * delta)
```

Its magnitude should match the configured drift velocity and its sign should match forward document
motion. A non-zero midpoint transform is not evidence of drift by itself.

Do not use the Layers panel as the primary geometry debugger. Start with DOM boxes, computed styles,
bounding rectangles, and sampled transforms; use Layers later for compositing and paint diagnosis.
