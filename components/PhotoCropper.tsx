import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { PixelCrop, ASPECT_RATIO } from '../types';
import { Slider } from 'lucide-react';

interface PhotoCropperProps {
  imageSrc: string;
  onCropComplete: (croppedArea: PixelCrop) => void;
}

const PhotoCropper: React.FC<PhotoCropperProps> = ({ imageSrc, onCropComplete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onRotationChange = useCallback((rotation: number) => {
    setRotation(rotation);
  }, []);

  // We only care about the pixel crop for the final cut
  const handleCropComplete = useCallback((_: any, croppedAreaPixels: PixelCrop) => {
    onCropComplete(croppedAreaPixels);
  }, [onCropComplete]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="relative w-full h-80 sm:h-96 bg-slate-900 rounded-lg overflow-hidden shadow-inner">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={ASPECT_RATIO}
          onCropChange={onCropChange}
          onCropComplete={handleCropComplete}
          onZoomChange={onZoomChange}
          onRotationChange={onRotationChange}
          showGrid={true}
          cropShape="rect"
          objectFit="contain"
        />
      </div>

      <div className="mt-6 space-y-4 px-2">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-700 w-16">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-label="Zoom"
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-700 w-16">Rotar</span>
          <input
            type="range"
            value={rotation}
            min={0}
            max={360}
            step={1}
            aria-label="Rotate"
            onChange={(e) => onRotationChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>
      
      <p className="text-xs text-slate-500 mt-2 text-center">
        Ajusta la imagen dentro del recuadro para el tamaño infantil (2.5cm x 3cm).
      </p>
    </div>
  );
};

export default PhotoCropper;
