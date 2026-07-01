export interface MediaSource {
  id: string;
  ownerId: string;
  name: string;
  type: 'nas_path' | 'windows_path' | 's3' | 'upload_temp';
  path: string;
  isActive: boolean;
  autoIndex: boolean;
  lastIndexedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MediaFile {
  id: string;
  ownerId: string;
  sourceId: string;
  filename: string;
  relativePath: string;
  mimeType: string;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  exifData: Record<string, unknown> | null;
  gpsLat: string | null;
  gpsLng: string | null;
  takenAt: string | null;
  thumbnailPath: string | null;
  blurHash: string | null;
  isFavorite: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Album {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  type: 'standard' | 'travel' | 'event' | 'timeline';
  coverMediaId: string | null;
  isShared: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
