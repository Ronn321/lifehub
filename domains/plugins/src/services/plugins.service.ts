import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PluginsRepository } from '../repositories/plugins.repository.js';
import type { Plugin } from '../entities/plugins.js';
import type { InstallPluginInput, UpdatePluginInput } from '../dtos/plugins.dto.js';

@Injectable()
export class PluginsService {
  constructor(private readonly repo: PluginsRepository) {}

  async findAll(ownerId: string): Promise<Plugin[]> {
    return this.repo.findAll(ownerId);
  }

  async install(ownerId: string, input: InstallPluginInput): Promise<Plugin> {
    const existing = await this.repo.findAll(ownerId);
    if (existing.some((p) => p.name === input.name)) {
      throw new ConflictException(`Plugin "${input.name}" ist bereits installiert.`);
    }
    return this.repo.create({
      name: input.name,
      version: input.version,
      description: input.description ?? null,
      author: input.author ?? null,
      homepage: input.homepage ?? null,
      ownerId,
    });
  }

  async uninstall(id: string, ownerId: string): Promise<void> {
    const plugin = await this.repo.findById(id, ownerId);
    if (!plugin) throw new NotFoundException('Plugin nicht gefunden.');
    await this.repo.delete(id, ownerId);
  }

  async toggle(id: string, ownerId: string): Promise<Plugin> {
    const plugin = await this.repo.findById(id, ownerId);
    if (!plugin) throw new NotFoundException('Plugin nicht gefunden.');
    return this.repo.update(id, ownerId, { enabled: !plugin.enabled }) as Promise<Plugin>;
  }

  async update(id: string, ownerId: string, input: UpdatePluginInput): Promise<Plugin> {
    const plugin = await this.repo.update(id, ownerId, input);
    if (!plugin) throw new NotFoundException('Plugin nicht gefunden.');
    return plugin;
  }
}
