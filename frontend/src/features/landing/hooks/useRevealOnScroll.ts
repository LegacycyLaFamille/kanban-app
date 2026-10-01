import { type RefObject, useEffect } from "react";

// Marks every [data-reveal] element under the root as revealed when it
// scrolls into view (the CSS animates it in). Without IntersectionObserver,
// everything is revealed at once so no content stays hidden.
export function useRevealOnScroll(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const reveal = (element: Element) => {
      element.setAttribute("data-revealed", "true");
    };

    if (typeof IntersectionObserver === "undefined") {
      targets.forEach(reveal);
      return;
    }

    // Content is hidden by CSS only once JS is known to drive the reveal.
    root.setAttribute("data-motion", "on");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, [rootRef]);
}
