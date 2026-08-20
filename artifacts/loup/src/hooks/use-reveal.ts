import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Fades + slides an element (or its direct children, staggered) into
 * view. The one reveal primitive for the whole app — every page should
 * use this rather than a bespoke gsap.from()/gsap.fromTo() call.
 *
 * Two modes:
 * - Default (scroll-triggered): fires once, the first time the element
 *   crosses 85% of the viewport. Use for content further down a page.
 * - `immediate: true`: fires on mount, no ScrollTrigger. Use for chrome
 *   that's always visible on load (a sidebar nav, a page header) where
 *   scroll-gating doesn't make sense.
 *
 * `immediate` reveals fire on every mount, which includes every route
 * change and every tab switch (each tab is its own component, so
 * switching tabs unmounts/remounts it) — not just first page load. A
 * large/slow reveal there reads as "the page reloading" on every click,
 * which is exactly what it isn't. So the immediate branch clamps y/x and
 * duration to small, fast values regardless of what's passed in — treat
 * `y`/`duration` on an immediate reveal as an upper bound, not a literal.
 * Scroll-triggered reveals fire once per session and aren't affected.
 *
 * IMPORTANT: uses gsap.fromTo() with an explicit end state, never
 * gsap.from(). A real bug was found where gsap.from({y: N, opacity: 0})
 * left elements with opacity resolved to 1 but the y/x-transform
 * permanently stuck at its start value, silently offsetting every
 * "revealed" element from its true layout position — invisible until you
 * inspect computed styles or measure bounding boxes, but it broke visual
 * symmetry/padding on every section that used it. gsap.fromTo() with an
 * explicit {opacity:1, y:0} (or x:0) target does not have this failure
 * mode. Do not revert to gsap.from().
 */
export function useReveal(
  ref: React.RefObject<HTMLElement | null>,
  opts?: {
    y?: number;
    x?: number;
    stagger?: boolean;
    delay?: number;
    duration?: number;
    immediate?: boolean;
    deps?: unknown[];
  }
) {
  const deps = opts?.deps ?? [];
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const targets: Element | Element[] = opts?.stagger ? Array.from(el.children) : el;
    const fromVars: gsap.TweenVars = { opacity: 0 };
    const toVars: gsap.TweenVars = {
      opacity: 1,
      duration: opts?.immediate ? Math.min(opts?.duration ?? 0.3, 0.3) : (opts?.duration ?? 0.8),
      delay: opts?.immediate ? Math.min(opts?.delay ?? 0, 0.1) : (opts?.delay ?? 0),
      ease: "power2.out",
      stagger: opts?.stagger ? (opts?.immediate ? 0.035 : 0.07) : 0,
    };
    if (!opts?.immediate) {
      toVars.scrollTrigger = { trigger: el, start: "top 85%", once: true };
    }
    const clampMagnitude = (n: number, max: number) => Math.sign(n) * Math.min(Math.abs(n), max);
    if (opts?.x !== undefined) {
      fromVars.x = opts.immediate ? clampMagnitude(opts.x, 4) : opts.x;
      toVars.x = 0;
    } else {
      const y = opts?.y ?? (opts?.immediate ? 4 : 28);
      fromVars.y = opts?.immediate ? clampMagnitude(y, 4) : y;
      toVars.y = 0;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(targets, fromVars, toVars);
    }, el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
