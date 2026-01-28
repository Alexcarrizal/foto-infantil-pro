import { jsPDF } from 'jspdf';
import { CHILD_PHOTO_WIDTH_MM, CHILD_PHOTO_HEIGHT_MM } from '../types';

export const generatePhotoSheet = (
  imageUrl: string, 
  count: number = 6
): jsPDF => {
  // A4 size in mm: 210 x 297
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const gap = 5;

  let x = margin;
  let y = margin;
  
  // Create a grid
  for (let i = 0; i < count; i++) {
    // Check if we need a new page
    if (y + CHILD_PHOTO_HEIGHT_MM > pageHeight - margin) {
      doc.addPage();
      x = margin;
      y = margin;
    }

    doc.addImage(imageUrl, 'PNG', x, y, CHILD_PHOTO_WIDTH_MM, CHILD_PHOTO_HEIGHT_MM);
    
    // Draw cutting guides (light gray border)
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, y, CHILD_PHOTO_WIDTH_MM, CHILD_PHOTO_HEIGHT_MM);

    // Move next
    x += CHILD_PHOTO_WIDTH_MM + gap;

    // Wrap to next row
    if (x + CHILD_PHOTO_WIDTH_MM > pageWidth - margin) {
      x = margin;
      y += CHILD_PHOTO_HEIGHT_MM + gap;
    }
  }

  return doc;
};
