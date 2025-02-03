export interface SignaturePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface Signature {
  id: string;
  type: 'draw' | 'image';
  dataUrl: string;
  position: SignaturePosition;
}