import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

@Controller('recipes')
export class RecipeImageController {
  @Get('image/:id')
  async getRecipeImage(@Param('id') id: string, @Res() res: any) {
    const basePath = process.env.LIFEHUB_RECIPES_IMAGES_PATH ?? '/data/storage/recipes';
    const mapPath = join(basePath, '.image-map.json');

    let filename: string | null = null;
    if (existsSync(mapPath)) {
      try {
        const map: Record<string, string> = JSON.parse(readFileSync(mapPath, 'utf-8'));
        filename = map[id] ?? null;
      } catch { /* ignore */ }
    }

    if (!filename) throw new NotFoundException('Recipe image not found');

    const filePath = join(basePath, filename);
    if (!existsSync(filePath)) throw new NotFoundException('Image file not on disk');

    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
    };
    res.setHeader('Content-Type', mimeTypes[ext] ?? 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    return res.sendFile(filePath);
  }
}
