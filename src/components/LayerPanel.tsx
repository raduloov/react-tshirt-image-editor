import React, { useState, useRef, useCallback, useEffect } from "react";
import type { ImageData, TShirtView } from "../types";

interface LayerPanelProps {
  images: ImageData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddImage: () => void;
  currentView: TShirtView;
  onViewChange: (view: TShirtView) => void;
  /** Compact mode for mobile drawer layout */
  compact?: boolean;
  /** Mobile mode for touch-optimized controls */
  isMobile?: boolean;
  /** Hide the add image button (when rendered separately outside) */
  hideAddButton?: boolean;
}

const ITEM_HEIGHT = 56; // Height of each layer item in pixels (desktop)
const MOBILE_ITEM_HEIGHT = 64; // Height of each layer item in pixels (mobile, min 48px for touch)

// teniski-varna color palette
const COLORS = {
  ACCENT: "#FAC000",
  BLACK: "#000000",
  WHITE: "#FFFFFF",
  GRAY: "#9B9B9B",
  LIGHT_GRAY: "#F7F7F7",
  DARK_GRAY: "#4A4A4A",
  RED: "#FF0000"
};

const panelStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: COLORS.WHITE,
  borderRadius: "10px",
  overflow: "hidden",
  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
  fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, sans-serif",
  // Prevent double-tap zoom on the panel
  touchAction: "manipulation"
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "8px",
  borderBottom: `1px solid ${COLORS.LIGHT_GRAY}`
};

const viewToggleContainerStyle: React.CSSProperties = {
  display: "flex",
  width: "100%",
  backgroundColor: COLORS.LIGHT_GRAY,
  borderRadius: "8px",
  padding: "4px"
};

const getViewButtonStyle = (isActive: boolean): React.CSSProperties => ({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  padding: "10px 12px",
  border: "none",
  borderRadius: "6px",
  backgroundColor: isActive ? COLORS.WHITE : "transparent",
  color: isActive ? COLORS.DARK_GRAY : COLORS.GRAY,
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease-out",
  boxShadow: isActive ? "0 2px 4px rgba(0, 0, 0, 0.08)" : "none"
});

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: "8px",
  flex: 1,
  overflowY: "auto",
  position: "relative"
};

const emptyStyle: React.CSSProperties = {
  padding: "32px 20px",
  textAlign: "center",
  color: COLORS.GRAY,
  fontSize: "13px",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center"
};

// Note: dragHandleStyle and dragLineStyle are now dynamic functions inside the component
// to support mobile-responsive sizing (getDragHandleStyle and getDragLineStyle)

// Plus icon for add button
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Front icon
const FrontIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20 21V19a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Back icon
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20 21V19a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Delete icon
const DeleteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Empty layers icon
const EmptyLayersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 1L1 4.5L8 8L15 4.5L8 1Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1 11.5L8 15L15 11.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1 8L8 11.5L15 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Base add button style - will be enhanced for mobile via getAddButtonStyle function
const addButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  width: "100%",
  padding: "12px 16px",
  margin: "8px 0",
  backgroundColor: COLORS.ACCENT,
  color: COLORS.BLACK,
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
  boxShadow: "0 2px 10px rgba(250, 192, 0, 0.3)",
  transition: "filter 0.1s ease-out, transform 0.1s ease-out"
};

// Mobile-optimized add button style
const getMobileAddButtonStyle = (isMobile: boolean): React.CSSProperties => ({
  ...addButtonStyle,
  padding: isMobile ? "16px 20px" : "12px 16px",
  minHeight: isMobile ? "52px" : "auto",
  fontSize: isMobile ? "15px" : "14px",
  gap: isMobile ? "8px" : "6px",
  touchAction: "manipulation"
});

export function LayerPanel({
  images,
  selectedId,
  onSelect,
  onDelete,
  onReorder,
  onAddImage,
  currentView,
  onViewChange,
  compact = false,
  isMobile = false,
  hideAddButton = false
}: LayerPanelProps) {
  // Adjust panel style for compact mode
  const dynamicPanelStyle: React.CSSProperties = compact
    ? { ...panelStyle, width: '100%', height: 'auto', borderRadius: '0 0 10px 10px', boxShadow: 'none' }
    : panelStyle;

  // Use mobile item height for touch-friendly targets
  const itemHeight = isMobile ? MOBILE_ITEM_HEIGHT : ITEM_HEIGHT;

  // Swipe-to-delete state
  const [swipeState, setSwipeState] = useState<{
    id: string;
    startX: number;
    currentX: number;
    pointerId: number;
  } | null>(null);

  const [dragState, setDragState] = useState<{
    draggingIndex: number;
    startY: number;
    currentY: number;
    pointerId?: number;
    element?: HTMLElement;
  } | null>(null);

  const listRef = useRef<HTMLUListElement>(null);

  // Reverse to show top layer first (last in array = top = first in list)
  const reversedImages = [...images].reverse();

  const handlePointerDown = useCallback((e: React.PointerEvent, reversedIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Capture pointer for reliable tracking across touch/mouse
    const element = e.currentTarget as HTMLElement;
    element.setPointerCapture(e.pointerId);

    setDragState({
      draggingIndex: reversedIndex,
      startY: e.clientY,
      currentY: e.clientY,
      pointerId: e.pointerId,
      element
    });
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragState) return;

      // Only process events for our captured pointer
      if (dragState.pointerId !== undefined && e.pointerId !== dragState.pointerId) return;

      setDragState(prev =>
        prev
          ? {
              ...prev,
              currentY: e.clientY
            }
          : null
      );
    },
    [dragState]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragState) return;

    // Release pointer capture if we have it
    if (dragState.element && dragState.pointerId !== undefined) {
      try {
        dragState.element.releasePointerCapture(dragState.pointerId);
      } catch {
        // Pointer capture may already be released
      }
    }

    const deltaY = dragState.currentY - dragState.startY;
    const indexDelta = Math.round(deltaY / itemHeight);
    const newReversedIndex = Math.max(0, Math.min(reversedImages.length - 1, dragState.draggingIndex + indexDelta));

    if (newReversedIndex !== dragState.draggingIndex) {
      // Convert reversed indices to original indices
      const fromOriginal = images.length - 1 - dragState.draggingIndex;
      const toOriginal = images.length - 1 - newReversedIndex;
      onReorder(fromOriginal, toOriginal);
    }

    setDragState(null);
  }, [dragState, reversedImages.length, images.length, onReorder, itemHeight]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);

      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };
    }
  }, [dragState, handlePointerMove, handlePointerUp]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  // Swipe-to-delete handlers (mobile only)
  const handleSwipeStart = useCallback((e: React.PointerEvent, id: string) => {
    if (!isMobile) return;
    // Only start swipe if not on drag handle (drag handle is on the left)
    const target = e.target as HTMLElement;
    if (target.closest('[data-drag-handle]')) return;

    setSwipeState({
      id,
      startX: e.clientX,
      currentX: e.clientX,
      pointerId: e.pointerId
    });
  }, [isMobile]);

  const handleSwipeMove = useCallback((e: PointerEvent) => {
    if (!swipeState) return;
    if (e.pointerId !== swipeState.pointerId) return;

    setSwipeState(prev => prev ? {
      ...prev,
      currentX: e.clientX
    } : null);
  }, [swipeState]);

  const handleSwipeEnd = useCallback(() => {
    if (!swipeState) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    // Delete threshold: swipe left more than 100px
    if (deltaX < -100) {
      onDelete(swipeState.id);
    }

    setSwipeState(null);
  }, [swipeState, onDelete]);

  // Add swipe listeners
  useEffect(() => {
    if (swipeState) {
      window.addEventListener("pointermove", handleSwipeMove);
      window.addEventListener("pointerup", handleSwipeEnd);
      window.addEventListener("pointercancel", handleSwipeEnd);

      return () => {
        window.removeEventListener("pointermove", handleSwipeMove);
        window.removeEventListener("pointerup", handleSwipeEnd);
        window.removeEventListener("pointercancel", handleSwipeEnd);
      };
    }
  }, [swipeState, handleSwipeMove, handleSwipeEnd]);

  // Calculate visual positions during drag
  const getItemStyle = (reversedIndex: number, isSelected: boolean, swipeOffset: number = 0): React.CSSProperties => {
    const isDragging = dragState?.draggingIndex === reversedIndex;

    let transform = swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : "translateY(0)";
    let zIndex = 1;
    let boxShadow = isSelected
      ? `0 0 0 2px ${COLORS.ACCENT}, 0 2px 10px rgba(250, 192, 0, 0.15)`
      : "0 1px 3px rgba(0, 0, 0, 0.05)";
    let transition =
      "transform 0.3s ease-out, background-color 0.3s ease-out, box-shadow 0.3s ease-out, border-color 0.3s ease-out";

    // Calculate background color for swipe feedback
    let backgroundColor = isDragging ? COLORS.WHITE : isSelected ? "#FEF9E7" : COLORS.WHITE;
    if (swipeOffset < -50) {
      // Red tint as user swipes to delete
      const intensity = Math.min(1, Math.abs(swipeOffset + 50) / 50);
      backgroundColor = `rgba(255, ${235 - intensity * 100}, ${235 - intensity * 100}, 1)`;
    }

    if (dragState) {
      if (isDragging) {
        // The dragged item follows the pointer - enhanced visual feedback
        const deltaY = dragState.currentY - dragState.startY;
        transform = `translateY(${deltaY}px) scale(1.03)`;
        zIndex = 100;
        boxShadow = "0 12px 28px rgba(0,0,0,0.2), 0 6px 12px rgba(0, 0, 0, 0.12)";
        transition = "box-shadow 0.3s ease-out, scale 0.15s ease-out";
        backgroundColor = "#FEF9E7"; // Highlight dragged item
      } else {
        // Other items shift to make room - smoother animation
        const draggedIndex = dragState.draggingIndex;
        const deltaY = dragState.currentY - dragState.startY;
        const targetIndex = Math.round(deltaY / itemHeight) + draggedIndex;
        const clampedTarget = Math.max(0, Math.min(reversedImages.length - 1, targetIndex));

        if (draggedIndex < reversedIndex && clampedTarget >= reversedIndex) {
          // Dragged item moved down past this item - shift up
          transform = `translateY(-${itemHeight}px)`;
        } else if (draggedIndex > reversedIndex && clampedTarget <= reversedIndex) {
          // Dragged item moved up past this item - shift down
          transform = `translateY(${itemHeight}px)`;
        }
      }
    }

    return {
      display: "flex",
      alignItems: "center",
      gap: isMobile ? "12px" : "10px",
      padding: isMobile ? "12px 14px" : "10px 12px",
      marginBottom: "6px",
      borderRadius: "10px",
      border: `1px solid ${isSelected ? COLORS.ACCENT : COLORS.LIGHT_GRAY}`,
      backgroundColor,
      cursor: "pointer",
      position: "relative",
      zIndex,
      transform,
      transition,
      boxShadow,
      height: `${itemHeight}px`,
      boxSizing: "border-box",
      overflow: "hidden"
    };
  };

  // Mobile-responsive thumbnail size
  const thumbnailSize = isMobile ? 44 : 36;
  const thumbnailStyle: React.CSSProperties = {
    width: `${thumbnailSize}px`,
    height: `${thumbnailSize}px`,
    objectFit: "contain",
    backgroundColor: COLORS.LIGHT_GRAY,
    borderRadius: "8px",
    border: `1px solid ${COLORS.LIGHT_GRAY}`,
    padding: "2px",
    flexShrink: 0
  };

  const labelStyle: React.CSSProperties = {
    flex: 1,
    fontSize: isMobile ? "14px" : "13px",
    fontWeight: 500,
    color: COLORS.DARK_GRAY,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  };

  // Mobile-responsive delete button (min 44px touch target)
  const deleteButtonSize = isMobile ? 44 : 28;
  const deleteButtonStyle: React.CSSProperties = {
    width: `${deleteButtonSize}px`,
    height: `${deleteButtonSize}px`,
    padding: 0,
    border: "none",
    borderRadius: "50%",
    backgroundColor: "transparent",
    color: COLORS.GRAY,
    cursor: "pointer",
    fontSize: isMobile ? "18px" : "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s ease-out",
    flexShrink: 0
  };

  const deleteButtonHoverStyle: React.CSSProperties = {
    ...deleteButtonStyle,
    backgroundColor: "#FFEBEB",
    color: COLORS.RED,
    transform: "scale(1.1)"
  };

  // Mobile-responsive drag handle styles
  const getDragHandleStyle = (isDragging: boolean): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    gap: isMobile ? "4px" : "3px",
    cursor: isDragging ? "grabbing" : "grab",
    padding: isMobile ? "10px 8px" : "6px 4px",
    borderRadius: "4px",
    transition: "background-color 0.3s ease-out",
    touchAction: "none",
    backgroundColor: isDragging ? "#e2e8f0" : "transparent",
    minWidth: isMobile ? "32px" : "18px",
    alignItems: "center"
  });

  const getDragLineStyle = (): React.CSSProperties => ({
    width: isMobile ? "14px" : "10px",
    height: isMobile ? "3px" : "2px",
    backgroundColor: COLORS.GRAY,
    borderRadius: "1px"
  });

  // Delete button with hover state
  const [hoveredDeleteId, setHoveredDeleteId] = useState<string | null>(null);

  const [addButtonHovered, setAddButtonHovered] = useState(false);
  const [addButtonActive, setAddButtonActive] = useState(false);

  return (
    <div style={dynamicPanelStyle}>
      {/* Hide view toggle in compact mode - it's rendered separately in TShirtBuilder */}
      {!compact && (
        <div style={headerStyle}>
          <div style={viewToggleContainerStyle}>
            <button style={getViewButtonStyle(currentView === "front")} onClick={() => onViewChange("front")}>
              <FrontIcon />
              Отпред
            </button>
            <button style={getViewButtonStyle(currentView === "back")} onClick={() => onViewChange("back")}>
              <BackIcon />
              Отзад
            </button>
          </div>
        </div>
      )}
      {!hideAddButton && (
        <div style={{ padding: "12px 12px 4px" }}>
          <button
            style={{
              ...getMobileAddButtonStyle(isMobile),
              margin: 0,
              ...(addButtonActive
                ? {
                    filter: "brightness(0.9)",
                    transform: "scale(0.95)"
                  }
                : addButtonHovered
                  ? {
                      filter: "brightness(0.9)"
                    }
                  : {})
            }}
            onClick={onAddImage}
            onMouseEnter={() => setAddButtonHovered(true)}
            onMouseLeave={() => {
              setAddButtonHovered(false);
              setAddButtonActive(false);
            }}
            onMouseDown={() => setAddButtonActive(true)}
            onMouseUp={() => setAddButtonActive(false)}
          >
            {isMobile ? (
              // Camera icon for mobile
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" />
              </svg>
            ) : (
              <PlusIcon />
            )}
            {isMobile ? "Качи снимка" : "Добави изображение"}
          </button>
        </div>
      )}
      {images.length === 0 ? (
        <div style={{
          ...emptyStyle,
          padding: isMobile ? "24px 16px" : "32px 20px"
        }}>
          <div style={{ marginBottom: "8px", opacity: 0.6 }}>
            <EmptyLayersIcon />
          </div>
          <div style={{ marginBottom: isMobile ? "8px" : "0" }}>
            Няма слоеве
          </div>
          {isMobile && (
            <div style={{ fontSize: "12px", color: COLORS.GRAY, lineHeight: 1.4 }}>
              Натиснете бутона отгоре за да качите снимка от камера или галерия
            </div>
          )}
        </div>
      ) : (
        <ul ref={listRef} style={listStyle}>
          {reversedImages.map((image, reversedIndex) => {
            const originalIndex = images.length - 1 - reversedIndex;
            const isSelected = image.id === selectedId;
            const isDragging = dragState?.draggingIndex === reversedIndex;

            // Calculate swipe offset for this item
            const swipeOffset = swipeState?.id === image.id
              ? Math.min(0, swipeState.currentX - swipeState.startX) // Only allow left swipe
              : 0;

            return (
              <li
                key={image.id}
                style={getItemStyle(reversedIndex, isSelected, swipeOffset)}
                onClick={() => !dragState && !swipeState && onSelect(image.id)}
                onPointerDown={e => handleSwipeStart(e, image.id)}
                onContextMenu={e => e.preventDefault()}
              >
                {/* Delete indicator shown when swiping */}
                {isMobile && swipeOffset < -20 && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: Math.abs(swipeOffset),
                      backgroundColor: swipeOffset < -100 ? COLORS.RED : "#FFEBEB",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: swipeOffset < -100 ? COLORS.WHITE : COLORS.RED,
                      transition: "background-color 0.2s ease-out",
                      borderRadius: "0 10px 10px 0"
                    }}
                  >
                    <DeleteIcon />
                  </div>
                )}
                <div
                  data-drag-handle
                  style={getDragHandleStyle(isDragging)}
                  onPointerDown={e => {
                    e.stopPropagation();
                    handlePointerDown(e, reversedIndex);
                  }}
                  onContextMenu={e => e.preventDefault()}
                >
                  <div style={getDragLineStyle()} />
                  <div style={getDragLineStyle()} />
                  <div style={getDragLineStyle()} />
                </div>
                <img
                  src={image.src}
                  alt={`Layer ${originalIndex + 1}`}
                  style={thumbnailStyle}
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                />
                <span style={labelStyle}>Слой {originalIndex + 1}</span>
                <button
                  style={hoveredDeleteId === image.id ? deleteButtonHoverStyle : deleteButtonStyle}
                  onClick={e => handleDelete(e, image.id)}
                  onMouseEnter={() => setHoveredDeleteId(image.id)}
                  onMouseLeave={() => setHoveredDeleteId(null)}
                  onPointerDown={e => e.stopPropagation()}
                  title="Изтрий слой"
                >
                  <DeleteIcon />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
