import { GoogleGenAI } from "@google/genai";

export const removeBackgroundWithGemini = async (base64Image: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key no encontrada. Verifica tu configuración.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Clean base64 string
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png'
            }
          },
          {
            text: "Edit this image: Replace the background with a clean, solid white background. Keep the person in the foreground exactly as they are. Do not crop or change the person."
          }
        ]
      }
    });

    // Extract the image from the response
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
           const mimeType = part.inlineData.mimeType || 'image/png';
           return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    // If we got text but no image, it might be a refusal
    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
    if (textPart) {
        throw new Error(`Gemini no devolvió una imagen. Respuesta: ${textPart.text}`);
    }
    
    throw new Error("Gemini no generó ninguna imagen ni texto de error.");

  } catch (error: any) {
    console.error("Error detallado de Gemini API:", error);
    throw new Error(error.message || "Error al conectar con el servicio de IA.");
  }
};