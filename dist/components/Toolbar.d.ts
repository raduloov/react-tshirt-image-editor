interface ToolbarProps {
    imageCount: number;
    hasSelection: boolean;
    onUploadClick: () => void;
    onRemoveClick: () => void;
    onRemoveAllClick: () => void;
    onExportClick?: () => void;
}
export declare function Toolbar({ imageCount, hasSelection, onUploadClick, onRemoveClick, onRemoveAllClick, onExportClick, }: ToolbarProps): import("react/jsx-runtime").JSX.Element;
export {};
