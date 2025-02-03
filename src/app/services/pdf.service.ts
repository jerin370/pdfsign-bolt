import { Injectable, signal } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import { Signature } from '../models/signature.model';
import { PDFDocument } from 'pdf-lib';
import { fabric } from 'fabric';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private pdfDoc: any;
  private _pdfBytes: ArrayBuffer | null = null;
  private signatures = signal<Signature[]>([]);
  currentPage = signal(1);
  totalPages = signal(0);
  pdfLoaded = signal(false);

  async loadPdf(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    // Clone the ArrayBuffer
    this._pdfBytes = arrayBuffer.slice(0);
    this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    this.totalPages.set(this.pdfDoc.numPages);
    this.currentPage.set(1);
    this.pdfLoaded.set(true);
  }

  async pdfBytes(): Promise<ArrayBuffer> {
    if (!this._pdfBytes) throw new Error('No PDF loaded');
    return this._pdfBytes;
  }

  async getPageAsCanvas(pageNumber: number): Promise<HTMLCanvasElement> {
    const page = await this.pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    return canvas;
  }

  addSignature(signature: Signature) {
    this.signatures.update(sigs => [...sigs, signature]);
  }

  updateSignature(updatedSignature: Signature) {
    this.signatures.update(sigs => 
      sigs.map(sig => sig.id === updatedSignature.id ? updatedSignature : sig)
    );
  }

  getSignatures() {
    return this.signatures;
  }

  async generateModifiedPdf(fabricCanvas: fabric.Canvas): Promise<Blob> {
    // Load the existing PDF document
    const pdfDoc = await PDFDocument.load(await this.pdfBytes());
    const pages = pdfDoc.getPages();

    // For each page with annotations
    const currentPage = pages[this.currentPage() - 1];
    
    // Convert the fabric canvas to an image
    const canvasDataUrl = fabricCanvas.toDataURL({ format: 'png' });
    const imageBytes = await fetch(canvasDataUrl).then(res => res.arrayBuffer());
    
    // Embed the image into the PDF
    const image = await pdfDoc.embedPng(imageBytes);
    
    // Get page dimensions
    const { width, height } = currentPage.getSize();
    
    // Draw the annotations on top of the PDF page
    currentPage.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    });

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    return new Blob([modifiedPdfBytes], { type: 'application/pdf' });
  }

  removeSignature(id: string) {
    this.signatures.update(sigs => sigs.filter(sig => sig.id !== id));
  }
}