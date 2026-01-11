import express from 'express';
import { storage } from './storage';
import { insertPresetSchema } from '../shared/schema';
import type { ApiResponse, PresetsListResponse, PresetResponse, DeleteResponse } from '../shared/routes';

const router = express.Router();

// GET /api/presets - List all presets
router.get('/presets', async (_req, res) => {
  try {
    const presets = await storage.getAllPresets();
    const response: PresetsListResponse = {
      success: true,
      data: presets,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch presets',
    };
    res.status(500).json(response);
  }
});

// GET /api/presets/:id - Get a single preset
router.get('/presets/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid preset ID',
      };
      return res.status(400).json(response);
    }

    const preset = await storage.getPreset(id);
    if (!preset) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Preset not found',
      };
      return res.status(404).json(response);
    }

    const response: PresetResponse = {
      success: true,
      data: preset,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch preset',
    };
    res.status(500).json(response);
  }
});

// POST /api/presets - Create a new preset
router.post('/presets', async (req, res) => {
  try {
    const parseResult = insertPresetSchema.safeParse(req.body);
    if (!parseResult.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid preset data: ' + parseResult.error.message,
      };
      return res.status(400).json(response);
    }

    const preset = await storage.createPreset(parseResult.data);
    const response: PresetResponse = {
      success: true,
      data: preset,
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to create preset',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/presets/:id - Delete a preset
router.delete('/presets/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid preset ID',
      };
      return res.status(400).json(response);
    }

    const deleted = await storage.deletePreset(id);
    if (!deleted) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Preset not found',
      };
      return res.status(404).json(response);
    }

    const response: DeleteResponse = {
      success: true,
      data: { deleted: true },
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to delete preset',
    };
    res.status(500).json(response);
  }
});

// Initialize and seed presets
export async function initializeDatabase() {
  await storage.seedPresets();
}

export default router;
