import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { ImageData } from '../types';

interface LayerPanelProps {
  images: ImageData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

const ITEM_HEIGHT = 52; // Height of each layer item in pixels

const panelStyle: React.CSSProperties = {
  width: '200px',
  backgroundColor: '#fff',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#f5f5f5',
  borderBottom: '1px solid #e0e0e0',
  fontSize: '12px',
  fontWeight: 600,
  color: '#666',
  textTransform: 'uppercase',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  maxHeight: '300px',
  overflowY: 'auto',
  position: 'relative',
};

const emptyStyle: React.CSSProperties = {
  padding: '20px',
  textAlign: 'center',
  color: '#999',
  fontSize: '13px',
};

const dragHandleStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  cursor: 'grab',
  padding: '4px',
  borderRadius: '2px',
};

const dragLineStyle: React.CSSProperties = {
  width: '12px',
  height: '2px',
  backgroundColor: '#999',
  borderRadius: '1px',
};

export function LayerPanel({
  images,
  selectedId,
  onSelect,
  onDelete,
  onReorder,
}: LayerPanelProps) {
  const [dragState, setDragState] = useState<{
    draggingIndex: number;
    startY: number;
    currentY: number;
  } | null>(null);

  const listRef = useRef<HTMLUListElement>(null);

  // Reverse to show top layer first (last in array = top = first in list)
  const reversedImages = [...images].reverse();

  const handleMouseDown = useCallback((e: React.MouseEvent, reversedIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    setDragState({
      draggingIndex: reversedIndex,
      startY: e.clientY,
      currentY: e.clientY,
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;

    setDragState(prev => prev ? {
      ...prev,
      currentY: e.clientY,
    } : null);
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    if (!dragState) return;

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
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  // Calculate visual positions during drag
  const getItemStyle = (reversedIndex: number, isSelected: boolean): React.CSSProperties => {
    const isDragging = dragState?.draggingIndex === reversedIndex;

    let transform = 'translateY(0)';
    let zIndex = 1;
    let boxShadow = 'none';
    let transition = 'transform 0.2s ease, background-color 0.15s, box-shadow 0.2s ease';

    if (dragState) {
      if (isDragging) {
        // The dragged item follows the mouse
        const deltaY = dragState.currentY - dragState.startY;
        transform = `translateY(${deltaY}px)`;
        zIndex = 100;
        boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        transition = 'box-shadow 0.2s ease';
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
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      borderBottom: '1px solid #eee',
      backgroundColor: isDragging ? '#fff' : isSelected ? '#e3f2fd' : 'transparent',
      cursor: 'pointer',
      position: 'relative',
      zIndex,
      transform,
      transition,
      boxShadow,
      height: `${ITEM_HEIGHT}px`,
      boxSizing: 'border-box',
    };
  };

  const thumbnailStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    objectFit: 'contain',
    backgroundColor: '#f5f5f5',
    borderRadius: '2px',
    border: '1px solid #ddd',
  };

  const labelStyle: React.CSSProperties = {
    flex: 1,
    fontSize: '13px',
    color: '#333',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const deleteButtonStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    padding: 0,
    border: 'none',
    borderRadius: '2px',
    backgroundColor: '#ffcdd2',
    color: '#c62828',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>Layers</div>
      {images.length === 0 ? (
        <div style={emptyStyle}>No images added</div>
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
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, reversedIndex)}
                >
                  <div style={dragLineStyle} />
                  <div style={dragLineStyle} />
                  <div style={dragLineStyle} />
                </div>
                <img
                  src={image.src}
                  alt={`Layer ${originalIndex + 1}`}
                  style={thumbnailStyle}
                  draggable={false}
                />
                <span style={labelStyle}>Layer {originalIndex + 1}</span>
                <button
                  style={deleteButtonStyle}
                  onClick={(e) => handleDelete(e, image.id)}
                  title="Delete"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
