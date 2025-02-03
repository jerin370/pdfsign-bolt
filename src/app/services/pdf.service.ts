import { Injectable, signal } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import { Signature } from '../models/signature.model';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private pdfDoc: any;
  private signatures = signal<Signature[]>([]);
  currentPage = signal(1);
  totalPages = signal(0);
  pdfLoaded = signal(false);

  async loadPdf(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    this.totalPages.set(this.pdfDoc.numPages);
    this.currentPage.set(1);
    this.pdfLoaded.set(true);
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
}