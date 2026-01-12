import type { ImageData, EditorConfig } from '../types';
interface UseImageUploadOptions {
    config: EditorConfig;
    onImageLoad: (imageData: ImageData) => void;
    onError?: (error: string) => void;
}
export declare function useImageUpload({ config, onImageLoad, onError }: UseImageUploadOptions): {
    inputRef: import("react").RefObject<HTMLInputElement>;
    handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleDrop: (event: React.DragEvent) => void;
    handleDragOver: (event: React.DragEvent) => void;
    openFilePicker: () => void;
    acceptedTypes: string[];
};
export {};
