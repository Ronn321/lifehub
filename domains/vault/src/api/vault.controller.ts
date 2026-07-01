import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { VaultService } from '../services/vault.service.js';
import { createVaultEntrySchema, updateVaultEntrySchema } from '../dtos/vault.dto.js';

@ApiTags('vault')
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionGuard)
@Controller('vault/entries')
export class VaultController {
  constructor(@Inject(VaultService) private readonly vault: VaultService) {}

  @Get()
  @RequirePermission('vault', 'read')
  @ApiOperation({ summary: 'Alle Tresor-Einträge abrufen' })
  async listEntries(@CurrentUser() user: JwtPayload) {
    return this.vault.listEntries(user.sub);
  }

  @Post()
  @RequirePermission('vault', 'create')
  @ApiOperation({ summary: 'Neuen Tresor-Eintrag anlegen' })
  async createEntry(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createVaultEntrySchema.parse(body);
    return this.vault.createEntry(user.sub, dto);
  }

  @Get(':id')
  @RequirePermission('vault', 'read')
  @ApiOperation({ summary: 'Tresor-Eintrag abrufen' })
  async getEntry(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.vault.getEntry(user.sub, id);
  }

  @Put(':id')
  @RequirePermission('vault', 'update')
  @ApiOperation({ summary: 'Tresor-Eintrag aktualisieren' })
  async updateEntry(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateVaultEntrySchema.parse(body);
    return this.vault.updateEntry(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('vault', 'delete')
  @ApiOperation({ summary: 'Tresor-Eintrag löschen' })
  async deleteEntry(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.vault.deleteEntry(user.sub, id);
  }

  @Post(':id/generate-totp')
  @RequirePermission('vault', 'read')
  @ApiOperation({ summary: 'Aktuellen TOTP-Code generieren' })
  async generateTotp(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.vault.generateTotp(user.sub, id);
  }
}
