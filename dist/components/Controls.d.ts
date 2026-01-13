import React from 'react';
import type { ImageTransform, ControlHandle, DragMode } from '../types';
interface ControlsProps {
    transform: ImageTransform;
    allowRotation: boolean;
    onPointerDown: (event: React.PointerEvent, mode: DragMode, handle?: ControlHandle['position']) => void;
}
export declare function Controls({ transform, allowRotation, onPointerDown }: ControlsProps): import("react/jsx-runtime").JSX.Element;
export {};
