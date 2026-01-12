export interface Position {
    x: number;
    y: number;
}
export interface Size {
    width: number;
    height: number;
}
export interface ImageTransform {
    position: Position;
    size: Size;
    rotation: number;
}
export interface ImageData {
    id: string;
    src: string;
    naturalWidth: number;
    naturalHeight: number;
    transform: ImageTransform;
}
export type TShirtView = 'front' | 'back';
export interface ViewImages {
    front: ImageData[];
    back: ImageData[];
}
export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export interface EditorConfig {
    /** Width of the editor canvas */
    width: number;
    /** Height of the editor canvas */
    height: number;
    /** Printable area boundaries (where images can be placed) */
    printableArea?: BoundingBox;
    /** Minimum image size in pixels */
    minImageSize?: number;
    /** Maximum image size in pixels */
    maxImageSize?: number;
    /** Whether to allow rotation */
    allowRotation?: boolean;
    /** Accepted file types for upload */
    acceptedFileTypes?: string[];
    /** Maximum file size in bytes */
    maxFileSize?: number;
}
export interface TShirtBuilderProps {
    /** Background image for front view (e.g., t-shirt template) */
    frontBgImage?: string;
    /** Background image for back view */
    backBgImage?: string;
    /** Editor configuration */
    config?: Partial<EditorConfig>;
    /** Callback when images change (includes both views) */
    onChange?: (images: ViewImages, currentView: TShirtView) => void;
    /** Callback when export is requested */
    onExport?: (dataUrl: string, view: TShirtView) => void;
    /** Custom class name */
    className?: string;
    /** Custom styles */
    style?: React.CSSProperties;
    /** Initial images for controlled mode */
    initialImages?: ViewImages;
}
export interface ControlHandle {
    position: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | 'rotate';
    cursor: string;
}
export type DragMode = 'move' | 'resize' | 'rotate' | null;
export interface DragState {
    mode: DragMode;
    imageId: string;
    startPosition: Position;
    startTransform: ImageTransform;
    handle?: ControlHandle['position'];
}
