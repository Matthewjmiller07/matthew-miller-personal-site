import type { LucideIcon } from 'lucide-react';

export interface FamilyMember {
  id: string;
  name: string;
  role?: string;
  originalImage: string | null;
  generatedImage: string | null;
  description: string;
  size: string;
  quantity: number;
}

export enum AppStep {
  LANDING = 'LANDING',
  UPLOAD = 'UPLOAD',
  ROSTER = 'ROSTER',
  DESIGN = 'DESIGN',
  SHOP = 'SHOP',
  CHECKOUT = 'CHECKOUT',
  SUCCESS = 'SUCCESS',
}

export interface ShippingDetails {
  fullName: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  email: string;
}

export interface PaymentDetails {
  cardNumber: string;
  expiry: string;
  cvc: string;
}

export interface DesignStyle {
  id: string;
  name: string;
  promptModifier: string;
  previewColor: string;
}

export interface ShirtColor {
  name: string;
  class: string;
  hex: string;
  textClass: string;
}

export interface StepConfig {
  id: AppStep;
  icon: LucideIcon;
  label: string;
}

export interface ShareableState {
  members: Array<Pick<FamilyMember, 'name' | 'description' | 'size' | 'quantity' | 'generatedImage'>>;
  selectedStyleId: string;
  shirtColorName: string;
  totalCost: number;
}

export const STYLES: DesignStyle[] = [
  { id: 'cartoon', name: 'Modern Cartoon', promptModifier: 'in a cute, vibrant modern vector cartoon style, flat colors, clean lines, white background', previewColor: 'bg-blue-100' },
  { id: 'pixar', name: '3D Character', promptModifier: 'as a cute 3D animated movie character, pixar style, soft lighting, 3d render, white background', previewColor: 'bg-orange-100' },
  { id: 'retro', name: 'Retro 80s', promptModifier: 'in a retro 1980s synthwave style, neon outlines, vintage texture, white background', previewColor: 'bg-purple-100' },
  { id: 'anime', name: 'Anime', promptModifier: 'as a japanese anime character, studio ghibli style, vibrant colors, cel shaded, white background', previewColor: 'bg-pink-100' },
  { id: 'clay', name: 'Claymation', promptModifier: 'as a claymation figurine, stop motion style, plasticine texture, soft focus, white background', previewColor: 'bg-yellow-100' },
  { id: 'sketch', name: 'Pencil Sketch', promptModifier: 'as a high quality artistic charcoal pencil sketch, highly detailed, white background', previewColor: 'bg-gray-100' },
  { id: 'hero', name: 'Superhero', promptModifier: 'reimagined as a heroic comic book superhero character, dynamic pose, bold colors, white background', previewColor: 'bg-red-100' },
  { id: 'oil', name: 'Oil Painting', promptModifier: 'as a classic oil painting, thick brush strokes, impressionist style, artistic, white background', previewColor: 'bg-amber-100' },
  { id: 'realistic', name: 'Enhanced Realistic', promptModifier: 'professional studio photography portrait, perfect lighting, 4k, highly detailed', previewColor: 'bg-green-100' },
];

export const SHIRT_COLORS: ShirtColor[] = [
  { name: 'White', class: 'bg-white', hex: '#ffffff', textClass: 'text-gray-900' },
  { name: 'Heather Gray', class: 'bg-gray-300', hex: '#d1d5db', textClass: 'text-gray-900' },
  { name: 'Black', class: 'bg-gray-900', hex: '#111827', textClass: 'text-white' },
  { name: 'Navy', class: 'bg-blue-900', hex: '#1e3a8a', textClass: 'text-white' },
  { name: 'Red', class: 'bg-red-600', hex: '#dc2626', textClass: 'text-white' },
];

export const PLACEHOLDER_HEADSHOTS = [
  'https://images.placeholders.dev/?width=512&height=512&text=KinConnect+Member+1',
  'https://images.placeholders.dev/?width=512&height=512&text=KinConnect+Member+2',
  'https://images.placeholders.dev/?width=512&height=512&text=KinConnect+Member+3',
];

export const PLACEHOLDER_DESIGNS = [
  'https://images.placeholders.dev/?width=768&height=768&text=Design+A',
  'https://images.placeholders.dev/?width=768&height=768&text=Design+B',
  'https://images.placeholders.dev/?width=768&height=768&text=Design+C',
];
