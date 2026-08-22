export interface Lead {
  id: string;
  converted: boolean;
  coordinator: string | null;
  company: string;
  name: string | null;
  phone: string | null;
  product: string | null;
  categoryId: string | null;
  source: string | null;
  date: string | null;
  price: string | null;
  result: string | null;
  priority: string | null;
  notes: string | null;
  deactivateReason: string | null;
  quotePrice: string | null;
  quotePriceType: string | null;
  quoteTerms: string | null;
  quotePriceDate: string | null;
  quoteResult: string | null;
  quoteResultDate: string | null;
  quoteFailReason: string | null;
}
