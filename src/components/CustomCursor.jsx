import { useEffect } from "react";

export default function CustomCursor() {
  useEffect(() => {
    if (window.innerWidth <= 768) return;

    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    const aurora = document.createElement("div");
    aurora.className = "cursor-aurora";

    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.appendChild(aurora);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX, ringY = mouseY;
    let dotX = mouseX, dotY = mouseY;
    let isHovering = false;
    let animationFrameId;

    const animate = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      dotX += (mouseX - dotX) * 0.55;
      dotY += (mouseY - dotY) * 0.55;

      dot.style.left = dotX + "px";
      dot.style.top = dotY + "px";
      ring.style.left = ringX + "px";
      ring.style.top = ringY + "px";
      aurora.style.left = ringX + "px";
      aurora.style.top = ringY + "px";

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (Math.random() > 0.82 && !isHovering) {
        const trail = document.createElement("div");
        trail.className = "cursor-trail";
        trail.style.left = mouseX + "px";
        trail.style.top = mouseY + "px";
        document.body.appendChild(trail);
        setTimeout(() => trail.remove(), 500);
      }
    };

    const onMouseDown = () => {
      ring.classList.add("click");
      dot.classList.add("click");

      const ripple = document.createElement("div");
      ripple.className = "click-ripple";
      ripple.style.left = mouseX + "px";
      ripple.style.top = mouseY + "px";
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    };

    const onMouseUp = () => {
      ring.classList.remove("click");
      dot.classList.remove("click");
    };

    const onMouseOver = (e) => {
      if (e.target.closest("a, button, input, select, textarea, .hover-target, .project-card, .skill-card, [role='button']")) {
        isHovering = true;
        ring.classList.add("hover");
        dot.classList.add("hover");
      }
    };

    const onMouseOut = (e) => {
      if (e.target.closest("a, button, input, select, textarea, .hover-target, .project-card, .skill-card, [role='button']")) {
        isHovering = false;
        ring.classList.remove("hover");
        dot.classList.remove("hover");
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    document.addEventListener("mouseout", onMouseOut, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      cancelAnimationFrame(animationFrameId);
      if (document.body.contains(dot)) document.body.removeChild(dot);
      if (document.body.contains(ring)) document.body.removeChild(ring);
      if (document.body.contains(aurora)) document.body.removeChild(aurora);
      document.querySelectorAll(".cursor-trail, .click-ripple").forEach(el => el.remove());
    };
  }, []);

  return null;
}
