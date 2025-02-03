import {
  Component,
  signal,
  effect,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { SignatureDialogComponent } from '../signature-dialog/signature-dialog.component';
import { PdfService } from '../../services/pdf.service';
import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
  ],
  template: `
    <div class="pdf-container">
      <div class="toolbar">
        <input type="file" #fileInput (change)="onFileSelected($event)" accept="application/pdf" />
        <button mat-raised-button color="primary" (click)="openSignatureDialog()">
          Add Signature
        </button>
        <button mat-raised-button (click)="uploadImage()">
          Add Image
        </button>
        <button mat-raised-button color="accent" (click)="saveAndDownload()" [disabled]="!pdfService.pdfLoaded()">
          <mat-icon>save_alt</mat-icon>
          Save PDF
        </button>
        <button 
          mat-raised-button 
          color="warn" 
          (click)="deleteSelected()"
          [disabled]="!selectedObject"
          *ngIf="pdfService.pdfLoaded()"
        >
          <mat-icon>delete</mat-icon>
          Delete Selected
        </button>
      </div>
      
      <div class="viewer">
        <canvas #pdfCanvas></canvas>
        <canvas #annotationCanvas></canvas>
      </div>

      <div class="page-controls" *ngIf="pdfService.pdfLoaded()">
        <button mat-button (click)="previousPage()" [disabled]="pdfService.currentPage() === 1">
          Previous
        </button>
        <span>Page {{pdfService.currentPage()}} of {{pdfService.totalPages()}}</span>
        <button mat-button (click)="nextPage()" [disabled]="pdfService.currentPage() === pdfService.totalPages()">
          Next
        </button>
      </div>
    </div>
  `,
  styles: [
    `
    .pdf-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px;
    }
    .toolbar {
      display: flex;
      gap: 10px;
    }
    .viewer {
      position: relative;
      border: 1px solid #ccc;
    }
    .viewer canvas {
      position: absolute;
      top: 0;
      left: 0;
    }
    .page-controls {
      display: flex;
      gap: 20px;
      align-items: center;
      justify-content: center;
    }
    .toolbar button mat-icon {
      margin-right: 4px;
    }
  `,
  ],
})
export class PdfViewerComponent implements AfterViewInit {
  @ViewChild('annotationCanvas')
  annotationCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pdfCanvas') pdfCanvasRef!: ElementRef<HTMLCanvasElement>;
  private fabricCanvas!: fabric.Canvas;
  selectedObject: fabric.Object | null = null;

  constructor(private dialog: MatDialog, public pdfService: PdfService) {
    effect(() => {
      if (this.pdfService.pdfLoaded()) {
        this.renderPage();
      }
    });
  }

  ngAfterViewInit() {
    this.initializeFabricCanvas();
    this.setupKeyboardEvents();
  }

  private initializeFabricCanvas() {
    this.fabricCanvas = new fabric.Canvas(
      this.annotationCanvasRef.nativeElement
    );
    this.fabricCanvas.setDimensions({
      width: 800,
      height: 1000,
    });

    // Add selection event listener
    this.fabricCanvas.on('selection:created', (e) => {
      this.selectedObject = e.selected?.[0] || null;
    });

    this.fabricCanvas.on('selection:cleared', () => {
      this.selectedObject = null;
    });

    this.fabricCanvas.on('selection:updated', (e) => {
      this.selectedObject = e.selected?.[0] || null;
    });
  }

  private setupKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.deleteSelected();
      }
    });
  }

  deleteSelected() {
    if (this.selectedObject) {
      const objectId = this.selectedObject.data?.id;
      this.fabricCanvas.remove(this.selectedObject);
      
      // Update signatures list if needed
      if (objectId) {
        this.pdfService.removeSignature(objectId);
      }
      
      this.selectedObject = null;
    }
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      await this.pdfService.loadPdf(file);
    }
  }

  async renderPage() {
    const pageCanvas = await this.pdfService.getPageAsCanvas(
      this.pdfService.currentPage()
    );
    this.fabricCanvas.setDimensions({
      width: pageCanvas.width,
      height: pageCanvas.height,
    });

    fabric.Image.fromURL(pageCanvas.toDataURL(), (img) => {
      this.fabricCanvas.setBackgroundImage(
        img,
        this.fabricCanvas.renderAll.bind(this.fabricCanvas)
      );
    });
  }

  openSignatureDialog() {
    const dialogRef = this.dialog.open(SignatureDialogComponent, {
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.addSignatureToCanvas(result);
      }
    });
  }

  private addSignatureToCanvas(dataUrl: string) {
    fabric.Image.fromURL(dataUrl, (img) => {
      img.scale(0.5);
      // Add custom data to track signatures
      img.data = {
        id: uuidv4(),
        type: 'signature'
      };
      this.fabricCanvas.add(img);

      const signature = {
        id: img.data.id,
        type: 'draw' as const,
        dataUrl,
        position: {
          x: img.left || 0,
          y: img.top || 0,
          width: img.getScaledWidth() || 0,
          height: img.getScaledHeight() || 0,
          page: this.pdfService.currentPage(),
        },
      };

      this.pdfService.addSignature(signature);
    });
  }

  uploadImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          this.addSignatureToCanvas(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  previousPage() {
    if (this.pdfService.currentPage() > 1) {
      this.pdfService.currentPage.update((page) => page - 1);
    }
  }

  nextPage() {
    if (this.pdfService.currentPage() < this.pdfService.totalPages()) {
      this.pdfService.currentPage.update((page) => page + 1);
    }
  }

  async saveAndDownload() {
    try {
      // Get the modified PDF as a Blob
      const modifiedPdfBlob = await this.pdfService.generateModifiedPdf(this.fabricCanvas);
      
      // Generate a default filename or use the original filename if available
      const originalFileName = (document.querySelector('input[type="file"]') as HTMLInputElement)?.files?.[0]?.name;
      const fileName = originalFileName 
        ? `modified_${originalFileName}` 
        : `modified_document_${new Date().toISOString()}.pdf`;

      // Save the file
      saveAs(modifiedPdfBlob, fileName);
    } catch (error) {
      console.error('Error saving PDF:', error);
      // Here you might want to add proper error handling, like showing a snackbar or alert
    }
  }
}
