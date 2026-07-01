export interface JellyfinServer {
  id: string;
  url: string;
  apiKey: string;
  isActive: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JellyfinLibrary {
  id: string;
  serverId: string;
  externalId: string | null;
  name: string;
  type: string | null;
  ownerId: string;
  createdAt: Date;
}

export interface JellyfinItem {
  id: string;
  libraryId: string;
  externalId: string | null;
  name: string;
  type: 'movie' | 'series' | 'episode' | string;
  path: string | null;
  watched: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaStreamInfo {
  type: 'Video' | 'Audio' | 'Subtitle';
  index: number;
  codec: string | null;
  language: string | null;
  title: string | null;
  isDefault: boolean;
  isForced: boolean;
  width: number | null;
  height: number | null;
  bitrate: number | null;
  deliveryMethod: string | null;
  deliveryUrl: string | null;
}
