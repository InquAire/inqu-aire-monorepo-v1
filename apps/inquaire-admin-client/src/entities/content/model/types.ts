export type ContentType = 'document' | 'image' | 'video' | 'other';

export interface Content {
  id: number;
  name: string;
  type: ContentType;
  size: string;
  uploadedAt: Date;
  uploadedBy?: string;
}

export interface ContentStats {
  documents: number;
  images: number;
  videos: number;
  others: number;
}
