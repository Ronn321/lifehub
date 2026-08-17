import { useAuthStore } from './auth-store';

export function getMediaStreamUrl(fileId: string): string {
  if (typeof window === 'undefined') return '';
  const token = useAuthStore.getState().accessToken ?? '';
  if (!token) return '';
  return `http://${window.location.hostname}:3007/api/v1/media/files/${fileId}/stream?token=${token}`;
}

export function getThumbnailUrl(fileId: string, size = 512): string {
  if (typeof window === 'undefined') return '';
  const token = useAuthStore.getState().accessToken ?? '';
  if (!token) return '';
  return `http://${window.location.hostname}:3007/api/v1/media/files/${fileId}/thumbnail?size=${size}&token=${token}`;
}
