import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import pkg from 'pg';
const { Pool } = pkg;
import { presets, type InsertPreset, type Preset, type PathPoint } from '../shared/schema';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/sdf_spatial_studio',
});

export const db = drizzle(pool);

// Database CRUD operations
export class Storage {
  // Get all presets
  async getAllPresets(): Promise<Preset[]> {
    const result = await db.select().from(presets).orderBy(presets.createdAt);
    return result.map(row => ({
      ...row,
      posture: row.posture as 'standing' | 'sitting' | 'lying',
    }));
  }

  // Get a preset by ID
  async getPreset(id: number): Promise<Preset | null> {
    const result = await db.select().from(presets).where(eq(presets.id, id)).limit(1);
    if (result.length === 0) return null;
    return {
      ...result[0],
      posture: result[0].posture as 'standing' | 'sitting' | 'lying',
    };
  }

  // Create a new preset
  async createPreset(data: InsertPreset): Promise<Preset> {
    const result = await db.insert(presets).values({
      name: data.name,
      pathData: data.pathData,
      height: data.height,
      posture: data.posture || 'standing',
    }).returning();
    return {
      ...result[0],
      posture: result[0].posture as 'standing' | 'sitting' | 'lying',
    };
  }

  // Delete a preset by ID
  async deletePreset(id: number): Promise<boolean> {
    const result = await db.delete(presets).where(eq(presets.id, id)).returning();
    return result.length > 0;
  }

  // Seed default presets
  async seedPresets(): Promise<void> {
    const existingPresets = await this.getAllPresets();
    if (existingPresets.length > 0) return;

    const defaultPresets: InsertPreset[] = [
      {
        name: 'Left Ear Tickle',
        height: '1.7',
        posture: 'standing',
        pathData: generateLeftEarTicklePath(),
      },
      {
        name: 'Neck Whisper',
        height: '1.7',
        posture: 'standing',
        pathData: generateNeckWhisperPath(),
      },
      {
        name: '360 Orbit',
        height: '1.7',
        posture: 'standing',
        pathData: generate360OrbitPath(),
      },
    ];

    for (const preset of defaultPresets) {
      await this.createPreset(preset);
    }
    console.log('✓ Seeded default sensation presets');
  }
}

// Path generation helpers for sensation presets
function generateLeftEarTicklePath(): PathPoint[] {
  const path: PathPoint[] = [];
  const duration = 3000; // 3 seconds
  const steps = 60;
  
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * duration;
    const progress = i / steps;
    // Start from front, move to left ear position (close proximity)
    path.push({
      x: -0.3 + progress * (-0.15), // Move towards left ear
      y: 1.6, // Ear height
      z: 0.5 - progress * 0.5, // Move closer
      t,
    });
  }
  return path;
}

function generateNeckWhisperPath(): PathPoint[] {
  const path: PathPoint[] = [];
  const duration = 4000; // 4 seconds
  const steps = 80;
  
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * duration;
    const angle = (i / steps) * Math.PI * 0.5; // Quarter circle behind
    const progressValue = i / steps;
    // Whisper near neck from behind
    path.push({
      x: Math.sin(angle) * 0.2,
      y: 1.5 + Math.sin(progressValue * Math.PI) * 0.1, // Slight vertical movement
      z: -0.3 - Math.cos(angle) * 0.1, // Behind the listener
      t,
    });
  }
  return path;
}

function generate360OrbitPath(): PathPoint[] {
  const path: PathPoint[] = [];
  const duration = 5000; // 5 seconds
  const steps = 100;
  const radius = 2;
  
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * duration;
    const angle = (i / steps) * Math.PI * 2; // Full circle
    path.push({
      x: Math.sin(angle) * radius,
      y: 1.5, // Ear level
      z: Math.cos(angle) * radius,
      t,
    });
  }
  return path;
}

export const storage = new Storage();
