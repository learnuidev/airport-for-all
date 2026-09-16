"use client";

import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ *
 * prefers-reduced-motion
 * ------------------------------------------------------------------ */

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ *
 * Reveal on scroll — mirrors the [data-reveal] CSS in globals.css
 * ------------------------------------------------------------------ */

export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: { threshold?: number; once?: boolean } = {},
) {
  const { threshold = 0.16, once = true } = options;
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const targets = Array.from(
      root.hasAttribute("data-reveal") ? [root] : root.querySelectorAll("[data-reveal]"),
    ) as HTMLElement[];

    if (!targets.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            element.setAttribute("data-reveal", "shown");
            if (once) observer.unobserve(element);
          } else if (!once) {
            element.setAttribute("data-reveal", "idle");
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [threshold, once]);

  return ref;
}

/* ------------------------------------------------------------------ *
 * Reading progress, in pages ("leaves") and percent
 * ------------------------------------------------------------------ */

export function useReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const value = scrollable > 0 ? window.scrollY / scrollable : 0;
      setProgress(Math.min(1, Math.max(0, value)));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}

/* ------------------------------------------------------------------ *
 * Which chapter is on screen
 * ------------------------------------------------------------------ */

export function useActiveSection(ids: string[], offset = 0.35) {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((x, y) => y.intersectionRatio - x.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      {
        rootMargin: `-${Math.round(offset * 100)}% 0px -${Math.round((1 - offset) * 100)}% 0px`,
        threshold: [0, 0.01, 0.25, 0.5, 0.75, 1],
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [ids, offset]);

  return active;
}

/* ------------------------------------------------------------------ *
 * Value animation (counters, scrubbers)
 * ------------------------------------------------------------------ */

export function useAnimatedNumber(
  target: number,
  options: { duration?: number; decimals?: number; start?: number } = {},
) {
  const { duration = 1100, decimals = 0, start = 0 } = options;
  const reduced = useReducedMotion();
  const [value, setValue] = useState(start);
  /** The value currently painted, so each new target eases from what's on screen. */
  const paintedRef = useRef(start);
  const frameRef = useRef(0);

  useEffect(() => {
    if (reduced) {
      paintedRef.current = target;
      setValue(target);
      return;
    }
    const from = paintedRef.current;
    const delta = target - from;
    if (Math.abs(delta) < 1e-9) return;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const next = Number((from + delta * eased).toFixed(decimals));
      paintedRef.current = next;
      setValue(next);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, decimals, reduced]);

  return value;
}

/** Counts up once the element scrolls into view. */
export function useCountUpOnView(
  target: number,
  options: { duration?: number; decimals?: number } = {},
) {
  const { duration = 1200, decimals = 0 } = options;
  const ref = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const value = useAnimatedNumber(visible ? target : 0, { duration, decimals });

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, value };
}

/* ------------------------------------------------------------------ *
 * Element size (for SVG charts that must be responsive)
 * ------------------------------------------------------------------ */

export function useElementWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

/** Scroll offset of an element from the top of the document. */
export function useScrollTo() {
  return (id: string, offset = 80) => {
    const element = document.getElementById(id);
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };
}
