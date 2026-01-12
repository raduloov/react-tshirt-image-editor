import type { ImageData } from '../types';
interface LayerPanelProps {
    images: ImageData[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onReorder: (fromIndex: number, toIndex: number) => void;
}
export declare function LayerPanel({ images, selectedId, onSelect, onDelete, onReorder, }: LayerPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
