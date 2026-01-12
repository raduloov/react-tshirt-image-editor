import type { ImageData, EditorConfig } from '../types';
export declare function exportToDataUrl(canvas: HTMLCanvasElement, backgroundImage: HTMLImageElement | null, images: ImageData[], config: EditorConfig, format?: 'image/png' | 'image/jpeg', quality?: number): Promise<string>;
export declare function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement;
