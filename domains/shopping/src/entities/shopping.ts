export interface ShoppingList {
  id: string;
  title: string;
  ownerId: string;
  color: string | null;
  store: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  amount: string | null;
  unit: string | null;
  category: string | null;
  checked: boolean;
  checkedBy: string | null;
  ord: number;
  recipeRefId: string | null;
  createdAt: string;
}

export interface ShoppingListWithItems extends ShoppingList {
  items: ShoppingItem[];
  itemCount: number;
  checkedCount: number;
}
