export type ListingStatus = "available" | "reserved" | "sold";

export type Listing = {
  id: string;
  seller_id: string | null;
  category_id: string;
  category_slug: string;
  category_name: string;
  title: string;
  slug: string;
  area: string | null;
  location_city: string | null;
  for_sale: boolean;
  for_rent: boolean;
  selling_price_omr: number | null;
  rental_price_omr: number | null;
  processing_fee_omr: number;
  stock_value_omr: number | null;
  commercial_registration_included: boolean;
  age_years: number | null;
  employee_count: number | null;
  financials_text: string | null;
  pros_text: string | null;
  cons_text: string | null;
  full_detail_text: string | null;
  cover_image_url: string | null;
  gallery_json: string | null;
  video_url: string | null;
  status: ListingStatus;
  published: boolean;
  featured: boolean;
  featured_rank: number | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  active: boolean;
  sort_order: number;
};

export type ListingFilters = {
  categorySlug?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: ListingStatus;
  forRent?: boolean;
  search?: string;
  sort?: "newest" | "price-asc" | "price-desc";
  featuredOnly?: boolean;
  limit?: number;
};
