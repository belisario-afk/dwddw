import { pgTable, serial, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// Database schema for presets
export const presets = pgTable('presets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  pathData: jsonb('path_data').$type<PathPoint[]>().notNull(),
  height: text('height').notNull(),
  posture: text('posture').notNull().default('standing'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Path point type for spatial audio positions
export interface PathPoint {
  x: number;
  y: number;
  z: number;
  t: number; // timestamp
}

// Zod schemas for validation
export const pathPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  t: z.number(),
});

export const presetSchema = z.object({
  id: z.number(),
  name: z.string(),
  pathData: z.array(pathPointSchema),
  height: z.string(),
  posture: z.enum(['standing', 'sitting', 'lying']),
  createdAt: z.date(),
});

export const insertPresetSchema = z.object({
  name: z.string().min(1),
  pathData: z.array(pathPointSchema),
  height: z.string(),
  posture: z.enum(['standing', 'sitting', 'lying']).default('standing'),
});

export type Preset = z.infer<typeof presetSchema>;
export type InsertPreset = z.infer<typeof insertPresetSchema>;
export type Posture = 'standing' | 'sitting' | 'lying';
