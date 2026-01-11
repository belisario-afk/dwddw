// API contract definitions for the SDF Spatial Studio
import type { Preset, InsertPreset } from './schema';

// API Routes
export const API_ROUTES = {
  presets: {
    list: '/api/presets',
    get: (id: number) => `/api/presets/${id}`,
    create: '/api/presets',
    delete: (id: number) => `/api/presets/${id}`,
  },
} as const;

// Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PresetsListResponse extends ApiResponse<Preset[]> {}
export interface PresetResponse extends ApiResponse<Preset> {}
export interface DeleteResponse extends ApiResponse<{ deleted: boolean }> {}

// Request types
export type CreatePresetRequest = InsertPreset;
