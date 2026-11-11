export const CATEGORIES = [
  { key: 'top', label: 'Top', plural: 'Tops' },
  { key: 'bottom', label: 'Bottom', plural: 'Bottoms' },
  { key: 'dress', label: 'Dress', plural: 'Dresses' },
  { key: 'outerwear', label: 'Outerwear', plural: 'Outerwear' },
  { key: 'shoes', label: 'Shoes', plural: 'Shoes' },
  { key: 'bag', label: 'Bag', plural: 'Bags' },
  { key: 'accessory', label: 'Accessory', plural: 'Accessories' },
] as const;

export type Category = (typeof CATEGORIES)[number]['key'];

export function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? 'Piece';
}

export function categoryPlural(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.plural ?? 'Pieces';
}

export type ItemSource = 'camera' | 'library' | 'url' | 'web';

export interface StoredImage {
  uri: string;
  thumbUri: string;
  width: number;
  height: number;
}

export interface Item {
  id: string;
  imageUri: string;
  thumbUri: string;
  name: string;
  category: Category;
  color?: string;
  brand?: string;
  notes?: string;
  source: ItemSource;
  createdAt: number;
}

export interface Outfit {
  id: string;
  name: string;
  itemIds: string[];
  note?: string;
  createdAt: number;
}

export interface Persona {
  id: string;
  name: string;
  imageUri: string;
  thumbUri: string;
  descriptor?: string;
  source: 'ai' | 'photo';
  createdAt: number;
}

export interface Render {
  id: string;
  outfitId: string;
  personaId: string;
  imageUri: string;
  engine: string;
  createdAt: number;
}

export interface OutfitSuggestion {
  name: string;
  itemIds: string[];
  reason: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestion?: OutfitSuggestion;
  tip?: string;
  createdAt: number;
}

export interface ImageResult {
  id: string;
  image: string;
  thumbnail: string;
  title: string;
  source: string;
  link?: string;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
