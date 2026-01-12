import React from 'react';
import type { ImageTransform, ControlHandle, DragMode } from '../types';

interface ControlsProps {
  transform: ImageTransform;
  allowRotation: boolean;
  onMouseDown: (
    event: React.MouseEvent,
    mode: DragMode,
    handle?: ControlHandle['position']
  ) => void;
}

const HANDLE_SIZE = 10;
const ACCENT_COLOR = '#4A4A4A'; // dark gray - subtle and professional

const handleStyle: React.CSSProperties = {
  position: 'absolute',
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  backgroundColor: '#ffffff',
  border: `2px solid ${ACCENT_COLOR}`,
  borderRadius: '50%',
  boxSizing: 'border-box',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
  transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
};

const rotateHandleStyle: React.CSSProperties = {
  position: 'absolute',
  width: HANDLE_SIZE + 2,
  height: HANDLE_SIZE + 2,
  backgroundColor: ACCENT_COLOR,
  border: '2px solid #fff',
  borderRadius: '50%',
  boxSizing: 'border-box',
  cursor: 'grab',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
};

export function Controls({ transform, allowRotation, onMouseDown }: ControlsProps) {
  const { position, size, rotation } = transform;

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    transformOrigin: 'center center',
    pointerEvents: 'none',
  };

  const borderStyle: React.CSSProperties = {
    position: 'absolute',
    inset: -1,
    border: `2px solid ${ACCENT_COLOR}`,
    borderRadius: '4px',
    pointerEvents: 'none',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  };

  const handles: Array<{
    position: ControlHandle['position'];
    style: React.CSSProperties;
  }> = [
    {
      position: 'nw',
      style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'nwse-resize' },
    },
    {
      position: 'ne',
      style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'nesw-resize' },
    },
    {
      position: 'sw',
      style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'nesw-resize' },
    },
    {
      position: 'se',
      style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'nwse-resize' },
    },
  ];

  return (
    <div style={containerStyle}>
      <div style={borderStyle} />

      {/* Resize handles */}
      {handles.map(({ position: pos, style }) => (
        <div
          key={pos}
          style={{ ...handleStyle, ...style, pointerEvents: 'auto' }}
          onMouseDown={(e) => onMouseDown(e, 'resize', pos)}
        />
      ))}

      {/* Rotation handle */}
      {allowRotation && (
        <>
          <div
            style={{
              position: 'absolute',
              top: -28,
              left: '50%',
              width: 1.5,
              height: 18,
              backgroundColor: ACCENT_COLOR,
              transform: 'translateX(-50%)',
              opacity: 0.8,
            }}
          />
          <div
            style={{
              ...rotateHandleStyle,
              top: -34 - HANDLE_SIZE / 2,
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'auto',
            }}
            onMouseDown={(e) => onMouseDown(e, 'rotate')}
          />
        </>
      )}
    </div>
  );
}
