import React from 'react';
import type { ImageTransform, ControlHandle, DragMode } from '../types';
interface ControlsProps {
    transform: ImageTransform;
    allowRotation: boolean;
    onMouseDown: (event: React.MouseEvent, mode: DragMode, handle?: ControlHandle['position']) => void;
}
export declare function Controls({ transform, allowRotation, onMouseDown }: ControlsProps): import("react/jsx-runtime").JSX.Element;
export {};
