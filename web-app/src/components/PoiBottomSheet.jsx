import { useEffect, useLayoutEffect, useRef, useState } from "react";

const GRIP_HEIGHT = 28;      // chiều cao vùng tay nắm (khớp CSS)
const DRAG_THRESHOLD = 6;    // px tối thiểu mới tính là kéo
const MID_RATIO = 0.5;
const FULL_RATIO = 0.92;

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

export default function PoiBottomSheet({
  children,
  resetKey,
  onLayoutChange,
}) {
  const bodyRef = useRef(null);
  const dragRef = useRef(null);

  const [peek, setPeek] = useState(112);
  const [height, setHeight] = useState(() =>
    Math.round(window.innerHeight * MID_RATIO)
  );
  const [dragging, setDragging] = useState(false);

  const midHeight = Math.round(window.innerHeight * MID_RATIO);
  const fullHeight = Math.round(window.innerHeight * FULL_RATIO);

  // Mỗi khi đổi POI/ngôn ngữ: đo lại mốc thấp, đưa thẻ về mốc giữa.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const title = body?.querySelector(".selected-poi-info h3");

    if (body && title) {
      const titleBottom =
        title.getBoundingClientRect().bottom -
        body.getBoundingClientRect().top;

      setPeek(Math.ceil(GRIP_HEIGHT + titleBottom + 14));
    }

    setHeight(Math.round(window.innerHeight * MID_RATIO));
  }, [resetKey]);

  // Báo chiều cao cho MapApp (để đẩy nút vị trí, ẩn thanh tìm kiếm).
  useEffect(() => {
    onLayoutChange?.({ height, dragging });
  }, [height, dragging, onLayoutChange]);

  useEffect(
    () => () => onLayoutChange?.({ height: 0, dragging: false }),
    [onLayoutChange]
  );

  // Xoay màn hình / đổi kích thước.
  useEffect(() => {
    const onResize = () =>
      setHeight((current) =>
        clamp(current, peek, Math.round(window.innerHeight * FULL_RATIO))
      );

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [peek]);

  const handlePointerDown = (event) => {
    // Không bắt kéo khi bấm vào nút (nút X, QR, nghe audio...).
    if (event.target.closest("button, a, input, select, textarea")) return;

    dragRef.current = {
      startY: event.clientY,
      startHeight: height,
      lastHeight: height,
      active: false,
    };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;

    const delta = drag.startY - event.clientY;

    if (!drag.active) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      drag.active = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }

    drag.lastHeight = clamp(drag.startHeight + delta, peek, fullHeight);
    setHeight(drag.lastHeight);
  };

  const handlePointerEnd = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.active) return;

    setDragging(false);

    // Hít vào mốc gần nhất, có thêm quán tính theo hướng kéo.
    const direction = Math.sign(drag.lastHeight - drag.startHeight);
    const projected = drag.lastHeight + direction * 50;

    const [nearest] = [peek, midHeight, fullHeight].sort(
      (a, b) => Math.abs(a - projected) - Math.abs(b - projected)
    );

    setHeight(nearest);
  };

  const isFull = height >= fullHeight - 4;

  return (
    <div
      className={`poi-sheet ${dragging ? "is-dragging" : ""} ${
        isFull ? "is-full" : ""
      }`}
      style={{
        height: fullHeight,
        transform: `translateY(${fullHeight - height}px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div className="poi-sheet-grip" aria-hidden="true">
        <span />
      </div>

      <div className="poi-sheet-body" ref={bodyRef}>
        {children}
      </div>
    </div>
  );
}