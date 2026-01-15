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
export declare function LayerPanel({ images, selectedId, onSelect, onDelete, onReorder, onAddImage, currentView, onViewChange, compact, isMobile, hideAddButton }: LayerPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
