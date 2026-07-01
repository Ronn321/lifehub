import {
  Body, Controller, Delete, Get, HttpCode, Param, Post, Put,
  UploadedFile, UseGuards, UseInterceptors, Res, Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { DocumentsService } from '../services/documents.service';
import { createDocumentSchema, updateDocumentSchema } from '../dtos/documents.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Post()
  @RequirePermission('documents', 'create')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const metadata = typeof body === 'object' && body !== null
      ? { ...body, file: undefined } as Record<string, unknown>
      : {};
    const dto = createDocumentSchema.parse(metadata);
    return this.docs.create(user.sub, dto, file ? {
      buffer: file.buffer,
      mimetype: file.mimetype,
      size: file.size,
      originalname: file.originalname,
    } : undefined);
  }

  @Get()
  @RequirePermission('documents', 'read')
  async list(@CurrentUser() user: JwtPayload) {
    return this.docs.list(user.sub);
  }

  @Get(':id')
  @RequirePermission('documents', 'read')
  async get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.docs.get(user.sub, id);
  }

  @Get(':id/download')
  @RequirePermission('documents', 'read')
  @Header('Content-Disposition', 'attachment')
  async download(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.docs.download(user.sub, id);
    if (!result) {
      res.status(404).json({ message: 'Keine Datei zum Download verfügbar' });
      return;
    }
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    result.stream.pipe(res);
  }

  @Put(':id')
  @RequirePermission('documents', 'update')
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateDocumentSchema.parse(body);
    return this.docs.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('documents', 'delete')
  async delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.docs.delete(user.sub, id);
  }
}
