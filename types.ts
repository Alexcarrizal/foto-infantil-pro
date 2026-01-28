export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhotoState {
  originalUrl: string | null;
  croppedUrl: string | null;
  processedUrl: string | null; // Final URL after B&W or BG removal
  isGrayscale: boolean;
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
}

export enum AppStep {
  UPLOAD = 0,
  CROP = 1,
  EDIT = 2,
  PRINT = 3
}

export const CHILD_PHOTO_WIDTH_MM = 25;
export const CHILD_PHOTO_HEIGHT_MM = 30;
export const ASPECT_RATIO = CHILD_PHOTO_WIDTH_MM / CHILD_PHOTO_HEIGHT_MM;
