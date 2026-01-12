import type { ImageData, ImageTransform, DragMode, ControlHandle, EditorConfig } from '../types';
interface UseImageTransformOptions {
    images: ImageData[];
    config: EditorConfig;
    onChange?: (images: ImageData[]) => void;
}
export declare function useImageTransform({ images, config, onChange }: UseImageTransformOptions): {
    selectedId: string | null;
    isDragging: boolean;
    handleMouseDown: (event: React.MouseEvent, imageId: string, mode: DragMode, handle?: ControlHandle["position"]) => void;
    selectImage: (imageId: string | null) => void;
    deselectAll: () => void;
    deleteImage: (imageId: string) => void;
    deleteSelected: () => void;
    bringToFront: (imageId: string) => void;
    sendToBack: (imageId: string) => void;
    reorderImage: (fromIndex: number, toIndex: number) => void;
    updateImageTransform: (imageId: string, newTransform: ImageTransform) => void;
};
export {};
