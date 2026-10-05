// Keep the sticky toolbar shortcut available only when the large button is off-screen.
export function createGenieVisibilityController() {
  let header = null;
  let observer = null;
  let visible = false;
  const apply = () => document.querySelectorAll(".wbe-genie-bar-button").forEach((button) => {
    button.hidden = visible;
    button.classList.toggle("wbe-genie-header-visible", visible);
  });
  const measure = () => {
    const rect = header?.getBoundingClientRect();
    visible = Boolean(rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth);
    apply();
  };
  return {
    sync() {
      const next = document.getElementById("wbe-genie-button");
      if (next !== header) {
        observer?.disconnect();
        window.removeEventListener("scroll", measure);
        window.removeEventListener("resize", measure);
        header = next;
        observer = null;
        if (header && typeof IntersectionObserver === "function") {
          observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            apply();
          });
          observer.observe(header);
        } else if (header) {
          window.addEventListener("scroll", measure, { passive: true });
          window.addEventListener("resize", measure);
        }
        measure();
      } else apply();
    },
    destroy() {
      observer?.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      observer = null;
      header = null;
      visible = false;
      apply();
    },
  };
}
