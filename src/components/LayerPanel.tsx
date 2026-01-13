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
}

const ITEM_HEIGHT = 56; // Height of each layer item in pixels

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
  width: "220px",
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
  maxHeight: "320px",
  overflowY: "auto",
  position: "relative"
};

const emptyStyle: React.CSSProperties = {
  padding: "32px 20px",
  textAlign: "center",
  color: COLORS.GRAY,
  fontSize: "13px"
};

const dragHandleStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "3px",
  cursor: "grab",
  padding: "6px 4px",
  borderRadius: "4px",
  transition: "background-color 0.3s ease-out",
  // Prevent touch behaviors on drag handle
  touchAction: "none"
};

const dragLineStyle: React.CSSProperties = {
  width: "10px",
  height: "2px",
  backgroundColor: COLORS.GRAY,
  borderRadius: "1px"
};

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

export function LayerPanel({
  images,
  selectedId,
  onSelect,
  onDelete,
  onReorder,
  onAddImage,
  currentView,
  onViewChange
}: LayerPanelProps) {
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
    const indexDelta = Math.round(deltaY / ITEM_HEIGHT);
    const newReversedIndex = Math.max(0, Math.min(reversedImages.length - 1, dragState.draggingIndex + indexDelta));

    if (newReversedIndex !== dragState.draggingIndex) {
      // Convert reversed indices to original indices
      const fromOriginal = images.length - 1 - dragState.draggingIndex;
      const toOriginal = images.length - 1 - newReversedIndex;
      onReorder(fromOriginal, toOriginal);
    }

    setDragState(null);
  }, [dragState, reversedImages.length, images.length, onReorder]);

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

  // Calculate visual positions during drag
  const getItemStyle = (reversedIndex: number, isSelected: boolean): React.CSSProperties => {
    const isDragging = dragState?.draggingIndex === reversedIndex;

    let transform = "translateY(0)";
    let zIndex = 1;
    let boxShadow = isSelected
      ? `0 0 0 2px ${COLORS.ACCENT}, 0 2px 10px rgba(250, 192, 0, 0.15)`
      : "0 1px 3px rgba(0, 0, 0, 0.05)";
    let transition =
      "transform 0.3s ease-out, background-color 0.3s ease-out, box-shadow 0.3s ease-out, border-color 0.3s ease-out";

    if (dragState) {
      if (isDragging) {
        // The dragged item follows the mouse
        const deltaY = dragState.currentY - dragState.startY;
        transform = `translateY(${deltaY}px) scale(1.02)`;
        zIndex = 100;
        boxShadow = "0 8px 24px rgba(0,0,0,0.15), 0 4px 8px rgba(0, 0, 0, 0.1)";
        transition = "box-shadow 0.3s ease-out";
      } else {
        // Other items shift to make room
        const draggedIndex = dragState.draggingIndex;
        const deltaY = dragState.currentY - dragState.startY;
        const targetIndex = Math.round(deltaY / ITEM_HEIGHT) + draggedIndex;
        const clampedTarget = Math.max(0, Math.min(reversedImages.length - 1, targetIndex));

        if (draggedIndex < reversedIndex && clampedTarget >= reversedIndex) {
          // Dragged item moved down past this item - shift up
          transform = `translateY(-${ITEM_HEIGHT}px)`;
        } else if (draggedIndex > reversedIndex && clampedTarget <= reversedIndex) {
          // Dragged item moved up past this item - shift down
          transform = `translateY(${ITEM_HEIGHT}px)`;
        }
      }
    }

    return {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 12px",
      marginBottom: "6px",
      borderRadius: "10px",
      border: `1px solid ${isSelected ? COLORS.ACCENT : COLORS.LIGHT_GRAY}`,
      backgroundColor: isDragging ? COLORS.WHITE : isSelected ? "#FEF9E7" : COLORS.WHITE,
      cursor: "pointer",
      position: "relative",
      zIndex,
      transform,
      transition,
      boxShadow,
      height: `${ITEM_HEIGHT}px`,
      boxSizing: "border-box"
    };
  };

  const thumbnailStyle: React.CSSProperties = {
    width: "36px",
    height: "36px",
    objectFit: "contain",
    backgroundColor: COLORS.LIGHT_GRAY,
    borderRadius: "8px",
    border: `1px solid ${COLORS.LIGHT_GRAY}`,
    padding: "2px"
  };

  const labelStyle: React.CSSProperties = {
    flex: 1,
    fontSize: "13px",
    fontWeight: 500,
    color: COLORS.DARK_GRAY,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  };

  const deleteButtonStyle: React.CSSProperties = {
    width: "28px",
    height: "28px",
    padding: 0,
    border: "none",
    borderRadius: "50%",
    backgroundColor: "transparent",
    color: COLORS.GRAY,
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s ease-out"
  };

  const deleteButtonHoverStyle: React.CSSProperties = {
    ...deleteButtonStyle,
    backgroundColor: "#FFEBEB",
    color: COLORS.RED,
    transform: "scale(1.1)"
  };

  // Delete button with hover state
  const [hoveredDeleteId, setHoveredDeleteId] = useState<string | null>(null);

  const [addButtonHovered, setAddButtonHovered] = useState(false);
  const [addButtonActive, setAddButtonActive] = useState(false);

  return (
    <div style={panelStyle}>
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
      <div style={{ padding: "12px 12px 4px" }}>
        <button
          style={{
            ...addButtonStyle,
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
          <PlusIcon />
          Добави изображение
        </button>
      </div>
      {images.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ marginBottom: "4px", opacity: 0.6 }}>
            <EmptyLayersIcon />
          </div>
          Няма слоеве
        </div>
      ) : (
        <ul ref={listRef} style={listStyle}>
          {reversedImages.map((image, reversedIndex) => {
            const originalIndex = images.length - 1 - reversedIndex;
            const isSelected = image.id === selectedId;
            const isDragging = dragState?.draggingIndex === reversedIndex;

            return (
              <li
                key={image.id}
                style={getItemStyle(reversedIndex, isSelected)}
                onClick={() => !dragState && onSelect(image.id)}
              >
                <div
                  style={{
                    ...dragHandleStyle,
                    cursor: isDragging ? "grabbing" : "grab",
                    backgroundColor: isDragging ? "#e2e8f0" : "transparent"
                  }}
                  onPointerDown={e => handlePointerDown(e, reversedIndex)}
                  onContextMenu={e => e.preventDefault()}
                >
                  <div style={dragLineStyle} />
                  <div style={dragLineStyle} />
                  <div style={dragLineStyle} />
                </div>
                <img src={image.src} alt={`Layer ${originalIndex + 1}`} style={thumbnailStyle} draggable={false} />
                <span style={labelStyle}>Слой {originalIndex + 1}</span>
                <button
                  style={hoveredDeleteId === image.id ? deleteButtonHoverStyle : deleteButtonStyle}
                  onClick={e => handleDelete(e, image.id)}
                  onMouseEnter={() => setHoveredDeleteId(image.id)}
                  onMouseLeave={() => setHoveredDeleteId(null)}
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
