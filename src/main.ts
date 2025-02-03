import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PdfViewerComponent } from './app/components/pdf-viewer/pdf-viewer.component';

bootstrapApplication(PdfViewerComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    provideRouter([])
  ]
}).catch(err => console.error(err));