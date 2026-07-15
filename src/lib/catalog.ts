import { createClient } from '@supabase/supabase-js';

// 1. Define your TypeScript interface (matches the JSON structure you shared earlier)
export interface CatalogCigar {
  uuid: string;
  brand: string;
  name: string;
  country: string;
  price: number | null;
  size: string;
  slug: string;
  image_url?: string;
  flavor_tags?: string[];
}

// 2. Initialize the Supabase Client
// Note: Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY 
// are added to your Cloudflare Worker's environment variables!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 3. Fetch the entire catalog asynchronously
export async function getCigars(): Promise<CatalogCigar[]> {
  const { data, error } = await supabase
    .from('cigars') // Make sure this matches your exact Supabase table name
    .select('*');

  if (error) {
    console.error('Error fetching cigars from Supabase:', error.message);
    return [];
  }

  // Maps the database rows directly to your TypeScript interface
  return data as CatalogCigar[];
}

// 4. Helper: Fetch a single cigar by its slug (highly recommended for dynamic routes!)
export async function getCigarBySlug(slug: string): Promise<CatalogCigar | null> {
  const { data, error } = await supabase
    .from('cigars')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error(`Error fetching cigar with slug ${slug}:`, error.message);
    return null;
  }

  return data as CatalogCigar;
}