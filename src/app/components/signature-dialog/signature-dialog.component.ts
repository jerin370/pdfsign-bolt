import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { fabric } from 'fabric';

@Component({
  selector: 'app-signature-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="signature-dialog">
      <h2>Create Signature</h2>
      <div class="canvas-container">
        <canvas #signatureCanvas></canvas>
      </div>
      <div class="actions">
        <button mat-button (click)="clear()">Clear</button>
        <button mat-raised-button color="primary" (click)="save()">Save</button>
        <button mat-button (click)="close()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    .signature-dialog {
      padding: 20px;
    }
    .canvas-container {
      border: 1px solid #ccc;
      margin: 20px 0;
    }
    .actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
  `]
})
export class SignatureDialogComponent implements AfterViewInit {
  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private canvas!: fabric.Canvas;
  
  constructor(private dialogRef: MatDialogRef<SignatureDialogComponent>) {}

  ngAfterViewInit() {
    this.initializeCanvas();
  }

  private initializeCanvas() {
    this.canvas = new fabric.Canvas(this.canvasRef.nativeElement, {
      isDrawingMode: true,
      width: 500,
      height: 200
    });

    this.canvas.freeDrawingBrush.width = 2;
    this.canvas.freeDrawingBrush.color = '#000000';
  }

  clear() {
    this.canvas.clear();
  }

  save() {
    const dataUrl = this.canvas.toDataURL();
    this.dialogRef.close(dataUrl);
  }

  close() {
    this.dialogRef.close();
  }
}