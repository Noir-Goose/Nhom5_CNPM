import { useEffect, useLayoutEffect, useRef, useState } from "react";

const DRAG_THRESHOLD = 6;  // px tối thiểu mới tính là kéo
const MID_RATIO = 0.5;     // mốc giữa
const FULL_RATIO = 0.92;   // mốc cao nhất

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

export default function PoiBottomSheet({
  title,
  resetKey,
  onClose,
  onGetQr,
  onLayoutChange,
  children,
}) {
  const headerRef = useRef(null);
  const dragRef = useRef(null);

  const [peek, setPeek] = useState(76);
  const [height, setHeight] = useState(() =>
    Math.round(window.innerHeight * MID_RATIO)
  );
  const [dragging, setDragging] = useState(false);

  const midHeight = Math.round(window.innerHeight * MID_RATIO);
  const fullHeight = Math.round(window.innerHeight * FULL_RATIO);

  // Mức thấp nhất = đúng chiều cao header (dấu kéo + tiêu đề + nút ×)
  useLayoutEffect(() => {
    if (headerRef.current) {
      setPeek(headerRef.current.offsetHeight);
    }
    setHeight(Math.round(window.innerHeight * MID_RATIO));
  }, [resetKey]);

  // Báo chiều cao cho MapApp (đẩy nút vị trí, ẩn thanh tìm kiếm)
  useEffect(() => {
    onLayoutChange?.({ height, dragging });
  }, [height, dragging, onLayoutChange]);

  useEffect(
    () => () => onLayoutChange?.({ height: 0, dragging: false }),
    [onLayoutChange]
  );

  useEffect(() => {
    const onResize = () =>
      setHeight((current) =>
        clamp(current, peek, Math.round(window.innerHeight * FULL_RATIO))
      );

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [peek]);

  const handlePointerDown = (event) => {
    if (event.target.closest("button")) return; // nút × vẫn bấm bình thường

    dragRef.current = {
      startY: event.clientY,
      startHeight: height,
      lastHeight: height,
      active: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;

    const delta = drag.startY - event.clientY;

    if (!drag.active) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      drag.active = true;
      setDragging(true);
    }

    drag.lastHeight = clamp(drag.startHeight + delta, peek, fullHeight);
    setHeight(drag.lastHeight);
  };

  const handlePointerEnd = (event) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    // Chạm nhẹ vào header (không kéo): đóng/mở nhanh thẻ
    if (!drag.active) {
      if (event.type === "pointerup") {
        setHeight((current) =>
          current <= peek + 4 ? midHeight : peek
        );
      }
      return;
    }

    setDragging(false);

    // Hít vào mốc gần nhất (thấp / giữa / cao), có quán tính theo hướng kéo
    const direction = Math.sign(drag.lastHeight - drag.startHeight);
    const projected = drag.lastHeight + direction * 50;

    const [nearest] = [peek, midHeight, fullHeight].sort(
      (a, b) => Math.abs(a - projected) - Math.abs(b - projected)
    );

    setHeight(nearest);
  };

  return (
    <div
      className={`poi-sheet ${dragging ? "is-dragging" : ""}`}
      style={{ height }}
    >
      {/* Giữ vào vùng này để kéo chiều cao thẻ */}
      <div
        className="poi-sheet-header"
        ref={headerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div className="poi-sheet-grip" aria-hidden="true">
          <span />
        </div>

        <div className="poi-sheet-title-row">
          <h3 className="poi-sheet-title">{title}</h3>

          <button
            type="button"
            className="poi-sheet-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
      </div>

      {/* Phần này cuộn độc lập với việc kéo thẻ */}
      <div className="poi-sheet-body">
        <div className="poi-sheet-qr-row">
          <button
            type="button"
            className="poi-sheet-qr-button"
            onClick={onGetQr}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4" />
            </svg>
            Lấy QR
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}