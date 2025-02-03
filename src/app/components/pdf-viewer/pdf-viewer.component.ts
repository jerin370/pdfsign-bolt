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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    SignatureDialogComponent,
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
  `,
  ],
})
export class PdfViewerComponent implements AfterViewInit {
  @ViewChild('annotationCanvas')
  annotationCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pdfCanvas') pdfCanvasRef!: ElementRef<HTMLCanvasElement>;
  private fabricCanvas!: fabric.Canvas;

  constructor(private dialog: MatDialog, public pdfService: PdfService) {
    effect(() => {
      if (this.pdfService.pdfLoaded()) {
        this.renderPage();
      }
    });
  }

  ngAfterViewInit() {
    this.initializeFabricCanvas();
  }

  private initializeFabricCanvas() {
    this.fabricCanvas = new fabric.Canvas(
      this.annotationCanvasRef.nativeElement
    );
    this.fabricCanvas.setDimensions({
      width: 800,
      height: 1000,
    });
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
      this.fabricCanvas.add(img);

      const signature = {
        id: uuidv4(),
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
}
