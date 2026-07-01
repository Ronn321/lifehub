import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { ProjectsService } from '../services/projects.service';
import { createProjectSchema, updateProjectSchema, createNoteSchema, updateNoteSchema, createLinkSchema } from '../dtos/projects.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('projects')
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projects: ProjectsService) {}

  @Post()
  @RequirePermission('projects', 'create')
  async createProject(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createProjectSchema.parse(body);
    return this.projects.createProject(user.sub, dto);
  }

  @Get()
  @RequirePermission('projects', 'read')
  async listProjects(@CurrentUser() user: JwtPayload) {
    return this.projects.listProjects(user.sub);
  }

  @Get(':id')
  @RequirePermission('projects', 'read')
  async getProject(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projects.getProjectWithDetails(user.sub, id);
  }

  @Put(':id')
  @RequirePermission('projects', 'update')
  async updateProject(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateProjectSchema.parse(body);
    return this.projects.updateProject(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('projects', 'delete')
  async deleteProject(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.projects.deleteProject(user.sub, id);
  }

  @Post(':id/notes')
  @RequirePermission('projects', 'update')
  async addNote(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createNoteSchema.parse(body);
    return this.projects.addNote(user.sub, id, dto);
  }

  @Put(':id/notes/:noteId')
  @RequirePermission('projects', 'update')
  async updateNote(
    @Param('id') id: string, @Param('noteId') noteId: string,
    @Body() body: unknown, @CurrentUser() user: JwtPayload,
  ) {
    const dto = updateNoteSchema.parse(body);
    return this.projects.updateNote(user.sub, id, noteId, dto);
  }

  @Delete(':id/notes/:noteId')
  @HttpCode(204)
  @RequirePermission('projects', 'update')
  async deleteNote(
    @Param('id') id: string, @Param('noteId') noteId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.projects.deleteNote(user.sub, id, noteId);
  }

  @Post(':id/links')
  @RequirePermission('projects', 'update')
  async addLink(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createLinkSchema.parse(body);
    return this.projects.addLink(user.sub, id, dto);
  }

  @Delete(':id/links/:linkId')
  @HttpCode(204)
  @RequirePermission('projects', 'update')
  async deleteLink(
    @Param('id') id: string, @Param('linkId') linkId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.projects.deleteLink(user.sub, id, linkId);
  }
}
