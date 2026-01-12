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

const HANDLE_SIZE = 12;

const handleStyle: React.CSSProperties = {
  position: 'absolute',
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  backgroundColor: '#fff',
  border: '2px solid #0066ff',
  borderRadius: '2px',
  boxSizing: 'border-box',
};

const rotateHandleStyle: React.CSSProperties = {
  position: 'absolute',
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  backgroundColor: '#0066ff',
  border: '2px solid #fff',
  borderRadius: '50%',
  boxSizing: 'border-box',
  cursor: 'grab',
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
    inset: 0,
    border: '2px dashed #0066ff',
    pointerEvents: 'none',
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
              top: -30,
              left: '50%',
              width: 2,
              height: 20,
              backgroundColor: '#0066ff',
              transform: 'translateX(-50%)',
            }}
          />
          <div
            style={{
              ...rotateHandleStyle,
              top: -36 - HANDLE_SIZE / 2,
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
