export type TripStatus = 'planned' | 'active' | 'completed';

export interface Trip {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  status: TripStatus;
  coverMediaId: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Destination {
  id: string;
  tripId: string;
  name: string;
  lat: string | null;
  lng: string | null;
  ord: number;
  createdAt: string;
}

export interface TripDay {
  id: string;
  tripId: string;
  date: string;
  title: string | null;
  notes: string | null;
  ord: number;
  createdAt: string;
}

export interface TripMediaRef {
  id: string;
  tripId: string;
  dayId: string | null;
  mediaId: string;
  caption: string | null;
  ord: number;
  createdAt: string;
}
