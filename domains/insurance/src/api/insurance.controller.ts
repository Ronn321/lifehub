import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { InsuranceService } from '../services/insurance.service.js';
import { createPolicySchema, updatePolicySchema, addDocumentSchema } from '../dtos/insurance.dto.js';

@ApiTags('insurance')
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionGuard)
@Controller('insurance')
export class InsuranceController {
  constructor(@Inject(InsuranceService) private readonly insurance: InsuranceService) {}

  @Get('policies')
  @RequirePermission('insurance', 'read')
  @ApiOperation({ summary: 'Alle Versicherungen abrufen' })
  async listPolicies(@CurrentUser() user: JwtPayload) {
    return this.insurance.listPolicies(user.sub);
  }

  @Post('policies')
  @RequirePermission('insurance', 'create')
  @ApiOperation({ summary: 'Neue Versicherung anlegen' })
  async createPolicy(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createPolicySchema.parse(body);
    return this.insurance.createPolicy(user.sub, dto);
  }

  @Get('policies/:id')
  @RequirePermission('insurance', 'read')
  @ApiOperation({ summary: 'Versicherung mit Dokumenten abrufen' })
  async getPolicy(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.insurance.getPolicy(user.sub, id);
  }

  @Put('policies/:id')
  @RequirePermission('insurance', 'update')
  @ApiOperation({ summary: 'Versicherung aktualisieren' })
  async updatePolicy(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updatePolicySchema.parse(body);
    return this.insurance.updatePolicy(user.sub, id, dto);
  }

  @Delete('policies/:id')
  @HttpCode(204)
  @RequirePermission('insurance', 'delete')
  @ApiOperation({ summary: 'Versicherung löschen' })
  async deletePolicy(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.insurance.deletePolicy(user.sub, id);
  }

  @Post('policies/:id/documents')
  @RequirePermission('insurance', 'update')
  @ApiOperation({ summary: 'Dokument zu Versicherung hinzufügen' })
  async addDocument(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = addDocumentSchema.parse(body);
    return this.insurance.addDocument(user.sub, id, dto);
  }
}
