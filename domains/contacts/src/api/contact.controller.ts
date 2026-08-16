import {
  Body, Controller, Delete, Get, HttpCode, Inject,
  Param, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { ContactService } from '../services/contact.service';
import { createContactSchema, updateContactSchema, querySchema } from '../dtos/contact.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('contacts')
export class ContactController {
  constructor(@Inject(ContactService) private readonly contacts: ContactService) {}

  @Get()
  @RequirePermission('contacts', 'read')
  async list(@Query() query: unknown, @CurrentUser() user: JwtPayload) {
    const q = querySchema.parse(query);
    return this.contacts.list(user.sub, q);
  }

  @Post()
  @RequirePermission('contacts', 'create')
  async create(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createContactSchema.parse(body);
    return this.contacts.create(user.sub, dto);
  }

  @Get(':id')
  @RequirePermission('contacts', 'read')
  async get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.contacts.get(user.sub, id);
  }

  @Put(':id')
  @RequirePermission('contacts', 'update')
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateContactSchema.parse(body);
    return this.contacts.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('contacts', 'delete')
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.contacts.remove(user.sub, id);
  }
}
