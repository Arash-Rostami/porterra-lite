export interface Product {
  id: string;
  name: string;
  categoryId: string | null;
  isCustom: boolean;
  createdAt: number;
}
