import { useEffect, useRef, useState } from "react";

type ScrollableTabsProps = {
  children: React.ReactNode;
  ariaLabel: string;
};

function ScrollableTabs({ children, ariaLabel }: ScrollableTabsProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const node = trackRef.current;
    if (!node) return;

    const { scrollLeft, scrollWidth, clientWidth } = node;
    const maxScrollLeft = scrollWidth - clientWidth;

    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < maxScrollLeft - 4);
  };

  useEffect(() => {
    updateScrollState();

    const node = trackRef.current;
    if (!node) return;

    const handleScroll = () => updateScrollState();
    const handleResize = () => updateScrollState();

    node.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      node.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [children]);

  const scrollByAmount = (direction: "left" | "right") => {
    const node = trackRef.current;
    if (!node) return;

    const amount = Math.max(node.clientWidth * 0.65, 220);

    node.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const arrowButtonStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(50% - 0.175rem)",
    transform: "translateY(-50%)",
    zIndex: 3,
    height: "2.8rem",
    width: "2.8rem",
    padding: 0,
    borderRadius: "999px",
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-surface-1)",
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "var(--shadow-soft)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    transition:
      "background 140ms ease, border-color 140ms ease, opacity 140ms ease",
  };

  return (
    <div
      style={{
        position: "relative",
        marginBottom: "1rem",
      }}
    >
      {canScrollLeft && (
        <button
          type="button"
          aria-label={`Scroll ${ariaLabel} left`}
          onClick={() => scrollByAmount("left")}
          style={{
            ...arrowButtonStyle,
            left: "0.25rem",
          }}
        >
          <span
            className="material-symbols-rounded"
            aria-hidden="true"
            style={{ fontSize: "1.2rem", lineHeight: 1 }}
          >
            chevron_left
          </span>
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          aria-label={`Scroll ${ariaLabel} right`}
          onClick={() => scrollByAmount("right")}
          style={{
            ...arrowButtonStyle,
            right: "0.25rem",
          }}
        >
          <span
            className="material-symbols-rounded"
            aria-hidden="true"
            style={{ fontSize: "1.2rem", lineHeight: 1 }}
          >
            chevron_right
          </span>
        </button>
      )}

      <div
        ref={trackRef}
        className="scrollable-tabs-track"
        role="group"
        aria-label={ariaLabel}
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          display: "flex",
          gap: "0.5rem",
          paddingBottom: "0.35rem",
          paddingLeft: "3rem",
          paddingRight: "3rem",
          scrollBehavior: "smooth",
        }}
      >
        {children}
      </div>

      {canScrollLeft && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: "0.35rem",
            width: "3.7rem",
            pointerEvents: "none",
            zIndex: 2,
            background:
              "linear-gradient(90deg, var(--bg-surface-1) 0%, var(--bg-surface-1) 50%, rgba(20, 20, 20, 0) 100%)",
          }}
        />
      )}

      {canScrollRight && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: "0.35rem",
            width: "3.7rem",
            pointerEvents: "none",
            zIndex: 2,
            background:
              "linear-gradient(270deg, var(--bg-surface-1) 0%, var(--bg-surface-1) 50%, rgba(20, 20, 20, 0) 100%)",
          }}
        />
      )}
    </div>
  );
}

export default ScrollableTabs;
