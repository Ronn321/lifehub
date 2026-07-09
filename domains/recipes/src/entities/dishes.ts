export interface Dish {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  caption: string | null;
  heroText: string | null;
  primaryColor: string | null;
  imageMediaId: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
