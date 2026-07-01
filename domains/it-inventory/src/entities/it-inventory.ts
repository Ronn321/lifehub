export type DeviceType = 'server' | 'nas' | 'router' | 'switch' | 'raspi' | 'printer' | 'pc' | 'laptop' | 'tablet' | 'phone' | 'other';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  ipAddress: string | null;
  macAddress: string | null;
  hostname: string | null;
  os: string | null;
  location: string | null;
  notes: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
