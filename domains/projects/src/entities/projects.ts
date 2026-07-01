export type ProjectType = 'planning' | 'building' | 'done' | 'archived';
export type ProjectStatus = '3d_print' | 'arduino' | 'raspi' | 'code' | 'electronics' | 'diy';

export interface Project {
  id: string;
  title: string;
  description: string | null;
  type: ProjectType;
  status: ProjectStatus;
  coverMediaId: string | null;
  githubUrl: string | null;
  youtubeUrl: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  filename: string;
  mimeType: string | null;
  fileSize: number | null;
  storagePath: string | null;
  kind: string;
  createdAt: string;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectLink {
  id: string;
  projectId: string;
  url: string;
  label: string | null;
  type: string;
  createdAt: string;
}
