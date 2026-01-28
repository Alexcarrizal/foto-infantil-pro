import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  Scissors, 
  Printer, 
  Download, 
  RotateCcw,
  Loader2,
  Check,
  Image as ImageIcon,
  Sun,
  Activity, // For contrast
  Eraser,
  Wand2 // Icon for auto magic
} from 'lucide-react';
import PhotoCropper from './components/PhotoCropper';
import { ManualEraser } from './components/ManualEraser';
import { AppStep, PixelCrop, CHILD_PHOTO_HEIGHT_MM, CHILD_PHOTO_WIDTH_MM } from './types';
import { getCroppedImg, applyImageFilters } from './services/imageUtils';
import { generatePhotoSheet } from './services/pdfService';
import { removeBackgroundWithGemini } from './services/geminiService';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  
  // 'croppedImage' acts as the Source of Truth for the current visual base (after crop)
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  
  // 'finalImage' is the result AFTER applying brightness/contrast/grayscale baked in
  const [finalImage, setFinalImage] = useState<string | null>(null);
  
  const [cropPixels, setCropPixels] = useState<PixelCrop | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  
  // Eraser state
  const [isEraserOpen, setIsEraserOpen] = useState(false);
  const [isAutoRemoving, setIsAutoRemoving] = useState(false);
  
  // Filter States
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  
  const [photoCount, setPhotoCount] = useState(6);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setOriginalImage(reader.result as string);
        setCurrentStep(AppStep.CROP);
      });
      reader.readAsDataURL(file);
    }
  };

  // 2. Crop Handler
  const performCrop = async () => {
    if (originalImage && cropPixels) {
      try {
        const cropped = await getCroppedImg(originalImage, cropPixels);
        if (cropped) {
          setCroppedImage(cropped);
          // Reset filters when new crop happens
          setBrightness(100);
          setContrast(100);
          setIsGrayscale(false);
          setCurrentStep(AppStep.EDIT);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 3. Eraser Handler
  const handleEraserSave = (newImage: string) => {
    setCroppedImage(newImage);
    setIsEraserOpen(false);
  };

  // 4. Auto Background Handler
  const handleAutoBackground = async () => {
    if (!croppedImage) return;
    setIsAutoRemoving(true);
    setProcessingMessage('Procesando fondo automáticamente...');
    
    try {
      const newImage = await removeBackgroundWithGemini(croppedImage);
      setCroppedImage(newImage);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al procesar el fondo automáticamente. Por favor, intenta con el borrador manual.");
    } finally {
      setIsAutoRemoving(false);
      setProcessingMessage('');
    }
  };

  // 5. Final Processing Handler
  const handleContinueToPrint = async () => {
    if (!croppedImage) return;

    setIsProcessing(true);
    setProcessingMessage('Preparando planilla final...');
    
    // Bake the CSS filters into a new image string
    try {
      const result = await applyImageFilters(croppedImage, {
        brightness,
        contrast,
        grayscale: isGrayscale
      });
      setFinalImage(result);
      setCurrentStep(AppStep.PRINT);
    } catch (e) {
      console.error(e);
      // Fallback
      setFinalImage(croppedImage);
      setCurrentStep(AppStep.PRINT);
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. PDF Generation
  const downloadPDF = () => {
    if (finalImage) {
      const doc = generatePhotoSheet(finalImage, photoCount);
      doc.save('foto-infantil-planilla.pdf');
    }
  };

  const resetApp = () => {
    setOriginalImage(null);
    setCroppedImage(null);
    setFinalImage(null);
    setCurrentStep(AppStep.UPLOAD);
    setIsGrayscale(false);
    setBrightness(100);
    setContrast(100);
    setIsEraserOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ImageIcon className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl text-slate-800">FotoInfantil Pro</h1>
          </div>
          {currentStep > AppStep.UPLOAD && (
            <button 
              onClick={resetApp}
              className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-1 font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Empezar de nuevo
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6">
        
        {/* Progress Stepper */}
        {!isEraserOpen && (
          <div className="mb-8 overflow-x-auto pb-2">
            <div className="flex items-center justify-between min-w-[300px] max-w-2xl mx-auto">
              {[
                { icon: Upload, label: "Subir" },
                { icon: Scissors, label: "Recortar" },
                { icon: Wand2, label: "Editar" },
                { icon: Printer, label: "Imprimir" },
              ].map((step, index) => {
                const isActive = currentStep === index;
                const isCompleted = currentStep > index;
                const Icon = step.icon;
                
                return (
                  <div key={index} className="flex flex-col items-center gap-2 relative z-0 group">
                    <div 
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                        ${isActive ? 'border-blue-600 bg-blue-50 text-blue-600' : ''}
                        ${isCompleted ? 'border-green-500 bg-green-50 text-green-500' : ''}
                        ${!isActive && !isCompleted ? 'border-slate-200 text-slate-400' : ''}
                      `}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs font-semibold ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                      {step.label}
                    </span>
                    {/* Connector Line */}
                    {index !== 3 && (
                       <div className={`absolute top-5 left-[50%] w-full h-[2px] -z-10 translate-x-[50%] ${currentStep > index ? 'bg-green-500' : 'bg-slate-200'}`} style={{width: 'calc(100% - 20px)'}}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
          
          {/* STEP 1: UPLOAD */}
          {currentStep === AppStep.UPLOAD && (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center">
              <div 
                className="w-full max-w-md border-2 border-dashed border-slate-300 rounded-xl p-10 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Sube tu foto aquí</h3>
                <p className="text-slate-500 text-sm mb-6">Formatos aceptados: JPG, PNG. Se recomienda fondo claro.</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-200">
                  Seleccionar Archivo
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {/* STEP 2: CROP */}
          {currentStep === AppStep.CROP && originalImage && (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Ajuste de Tamaño Infantil</h2>
              <PhotoCropper 
                imageSrc={originalImage} 
                onCropComplete={(pixels) => setCropPixels(pixels)} 
              />
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={performCrop}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-blue-200 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <Scissors className="w-4 h-4" />
                  Recortar Imagen
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: EDIT */}
          {currentStep === AppStep.EDIT && croppedImage && (
            isEraserOpen ? (
              <ManualEraser 
                imageSrc={croppedImage} 
                onSave={handleEraserSave}
                onCancel={() => setIsEraserOpen(false)}
              />
            ) : (
              <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Editor de Fotografía</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* Preview Image */}
                  <div className="flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vista Previa</span>
                    {/* Add bg-white to this container so transparent areas look white */}
                    <div className="relative shadow-xl ring-4 ring-white bg-white bg-[url('https://border-radius.com/images/checkered-bg.png')]">
                      {/* The image itself */}
                      <img 
                        src={croppedImage} 
                        alt="Preview" 
                        style={{ 
                          width: `${CHILD_PHOTO_WIDTH_MM * 6}px`, // Scaled for display
                          height: `${CHILD_PHOTO_HEIGHT_MM * 6}px`,
                          objectFit: 'cover',
                          // CSS Filters for realtime preview
                          filter: `brightness(${brightness}%) contrast(${contrast}%) grayscale(${isGrayscale ? 1 : 0})`
                        }} 
                      />
                       {(isProcessing || isAutoRemoving) && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                          <span className="text-xs font-medium text-blue-700 px-4 text-center">{processingMessage}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-center text-xs text-slate-500 mt-2">
                      Medidas: {CHILD_PHOTO_WIDTH_MM}mm x {CHILD_PHOTO_HEIGHT_MM}mm
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="space-y-6">
                    
                    {/* Manual Tools */}
                    <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Wand2 className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-semibold text-indigo-900">Fondo de Imagen</h3>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={handleAutoBackground}
                          disabled={isAutoRemoving || isProcessing}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          {isAutoRemoving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4" />}
                          Eliminar Fondo Automáticamente
                        </button>
                        
                        <div className="relative flex items-center py-1">
                          <div className="flex-grow border-t border-indigo-200"></div>
                          <span className="flex-shrink-0 mx-2 text-xs text-indigo-400">o manual</span>
                          <div className="flex-grow border-t border-indigo-200"></div>
                        </div>

                        <button 
                          onClick={() => setIsEraserOpen(true)}
                          disabled={isAutoRemoving || isProcessing}
                          className="w-full bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <Eraser className="w-4 h-4" />
                          Borrador Manual
                        </button>
                      </div>
                    </div>

                    {/* Adjustments */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <h3 className="font-semibold text-slate-800">Ajustes de Color</h3>
                         <button 
                           onClick={() => { setBrightness(100); setContrast(100); setIsGrayscale(false); }}
                           className="text-xs text-blue-600 font-medium hover:underline"
                         >
                           Restaurar
                         </button>
                      </div>

                      {/* Brightness */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span className="flex items-center gap-1"><Sun className="w-3 h-3"/> Brillo</span>
                          <span>{brightness}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="150"
                          value={brightness}
                          onChange={(e) => setBrightness(Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>

                      {/* Contrast */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span className="flex items-center gap-1"><Activity className="w-3 h-3"/> Contraste</span>
                          <span>{contrast}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="150"
                          value={contrast}
                          onChange={(e) => setContrast(Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                      
                      {/* Grayscale */}
                      <label className="flex items-center p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={isGrayscale}
                          onChange={(e) => setIsGrayscale(e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-3 text-sm font-medium text-slate-700">Blanco y Negro</span>
                      </label>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                       <button
                          onClick={() => setCurrentStep(AppStep.CROP)}
                          className="text-slate-500 hover:text-slate-800 text-sm font-medium px-4 py-2"
                       >
                         Atrás
                       </button>
                       <button
                          onClick={handleContinueToPrint}
                          disabled={isProcessing || isAutoRemoving}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-200 flex items-center gap-2"
                       >
                         {isProcessing && <Loader2 className="w-4 h-4 animate-spin"/>}
                         Continuar a Imprimir
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* STEP 4: PRINT / DOWNLOAD */}
          {currentStep === AppStep.PRINT && finalImage && (
            <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
              
              {/* Left Column: Controls */}
              <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div>
                   <h2 className="text-2xl font-bold text-slate-800 mb-2">Vista Previa</h2>
                   <p className="text-slate-500">Tu planilla está lista para descargar.</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <label className="block text-sm font-medium text-slate-700 mb-3">Cantidad de Fotos</label>
                  <div className="flex items-center gap-4 mb-4">
                     <input 
                      type="range" 
                      min={1} 
                      max={30} 
                      value={photoCount} 
                      onChange={(e) => setPhotoCount(Number(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                     />
                     <span className="font-mono text-lg font-bold text-blue-600 w-10 text-center">{photoCount}</span>
                  </div>
                  <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="font-semibold mb-1">Especificaciones:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Papel: Tamaño Carta / A4</li>
                      <li>Medida foto: 2.5cm x 3cm</li>
                      <li>Margen: 1.5cm</li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                   <button 
                    onClick={downloadPDF}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-blue-200 flex items-center justify-center gap-2 transform hover:-translate-y-1 transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Descargar PDF
                  </button>
                  <button
                    onClick={() => setCurrentStep(AppStep.EDIT)}
                    className="w-full px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                  >
                    Volver a Editar
                  </button>
                </div>
              </div>

              {/* Right Column: Realistic A4 Preview */}
              <div className="w-full lg:w-2/3 bg-slate-200/50 rounded-2xl p-4 sm:p-8 flex items-center justify-center overflow-auto">
                <div 
                  className="bg-white shadow-2xl relative transition-all duration-300"
                  style={{
                    // A4 Ratio is 1 : 1.414. We use a base width to scale it responsively.
                    // Max width 500px for desktop view
                    width: '100%',
                    maxWidth: '500px',
                    aspectRatio: '210 / 297',
                    padding: '35px', // Approx equivalent to 15mm margin relative to display size
                  }}
                >
                  <div className="w-full h-full flex flex-wrap content-start gap-[10px]"> 
                    {/* The gap and sizes here are approximations for visual preview. 
                        Actual PDF generation uses precise mm logic. 
                        We assume approx 6 items per row based on 25mm width on 210mm paper with margins.
                    */}
                    {Array.from({ length: photoCount }).map((_, i) => (
                      <div 
                        key={i} 
                        className="relative border border-slate-200 bg-slate-50"
                        style={{
                           width: 'calc(16.66% - 10px)', // roughly 6 per row
                           aspectRatio: `${CHILD_PHOTO_WIDTH_MM} / ${CHILD_PHOTO_HEIGHT_MM}`
                        }}
                      >
                         <img src={finalImage} alt={`foto-${i}`} className="w-full h-full object-cover" />
                         {/* Cut lines simulation */}
                         <div className="absolute inset-0 border-[0.5px] border-slate-300/50"></div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Watermark/Footer simulation */}
                  <div className="absolute bottom-4 right-4 text-[10px] text-slate-300">
                    FotoInfantil Pro
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
      
      <footer className="bg-white border-t border-slate-200 py-6 mt-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} FotoInfantil Pro. Privacidad y Seguridad garantizada.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;