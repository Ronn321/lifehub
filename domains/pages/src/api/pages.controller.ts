import {
  Body, Controller, Delete, Get, HttpCode, Inject,
  Param, Post, Put, UseGuards, Query, BadRequestException,
  Res, Header,
} from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { PagesService } from '../services/pages.service';
import {
  createPageSchema, updatePageSchema,
  createBlockSchema, updateBlockSchema,
  reorderBlocksSchema,
  createRelationSchema,
  createTemplateSchema, updateTemplateSchema,
  createResearchSessionSchema, updateResearchSessionSchema,
  createResearchSourceSchema,
  createResearchCollectionSchema,
  importPageSchema,
  pageFormatSchema,
  movePageSchema,
  pagePermissionOverrideSchema,
} from '../dtos/pages.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('pages')
export class PagesController {
  constructor(@Inject(PagesService) private readonly pages: PagesService) {}

  // ========== PAGES ==========

  @Post()
  @RequirePermission('pages', 'create')
  async createPage(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createPageSchema.parse(body);
    return this.pages.createPage(user.sub, dto);
  }

  // ========== IMPORT ==========
  // Static route — must be BEFORE :id wildcard

  @Post('import')
  @RequirePermission('pages', 'create')
  async importPage(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = importPageSchema.parse(body);
    return this.pages.importPage(user.sub, dto);
  }

  @Get()
  @RequirePermission('pages', 'read')
  async listPages(@CurrentUser() user: JwtPayload) {
    return this.pages.listPages(user.sub);
  }

  // ========== PAGE BY SLUG ==========
  // MUST be before :id to avoid route conflicts

  @Get('by-slug/:slug')
  @RequirePermission('pages', 'read')
  async getPageBySlug(@Param('slug') slug: string, @CurrentUser() user: JwtPayload) {
    return this.pages.getPageBySlug(user.sub, slug);
  }

  // ========== PAGE PINS ==========
  // MUST be before :id to avoid route conflicts

  @Get('pin/list')
  @RequirePermission('pages', 'read')
  async getPinnedPages(@CurrentUser() user: JwtPayload) {
    return this.pages.getPinnedPages(user.sub);
  }

  @Post('pin/add/:pageId')
  @HttpCode(204)
  @RequirePermission('pages', 'read')
  async addPin(@Param('pageId') pageId: string, @CurrentUser() user: JwtPayload) {
    await this.pages.addPin(user.sub, pageId);
  }

  @Delete('pin/remove/:pageId')
  @HttpCode(204)
  @RequirePermission('pages', 'read')
  async removePin(@Param('pageId') pageId: string, @CurrentUser() user: JwtPayload) {
    await this.pages.removePin(user.sub, pageId);
  }

  @Get('pin/check/:pageId')
  @RequirePermission('pages', 'read')
  async isPinned(@Param('pageId') pageId: string, @CurrentUser() user: JwtPayload) {
    return this.pages.isPinned(user.sub, pageId);
  }

  // ========== PAGE CHILDREN ==========

  @Get(':id/children')
  @RequirePermission('pages', 'read')
  async getPageChildren(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.pages.getPageChildren(user.sub, id);
  }

  // ========== GET PAGE BY ID ==========

  @Get('search')
  @RequirePermission('pages', 'read')
  async searchPages(@Query('q') query: string, @CurrentUser() user: JwtPayload) {
    return this.pages.searchPages(user.sub, query);
  }

  @Get(':id')
  @RequirePermission('pages', 'read')
  async getPage(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.pages.getPageWithBlocks(user.sub, id);
  }

  @Put(':id')
  @RequirePermission('pages', 'update')
  async updatePage(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updatePageSchema.parse(body);
    return this.pages.updatePage(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('pages', 'delete')
  async deletePage(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.pages.deletePage(user.sub, id);
  }

  // ========== PAGE MOVE ==========

  @Post(':id/move')
  @HttpCode(200)
  @RequirePermission('pages', 'update')
  async movePage(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = movePageSchema.parse(body);
    return this.pages.movePage(user.sub, id, dto.newParentId);
  }

  // ========== PAGE EXPORT ==========

  @Get(':id/export')
  @RequirePermission('pages', 'read')
  async exportPage(
    @Param('id') id: string,
    @Query('format') format: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (format === 'markdown') {
      const md = await this.pages.exportPageMarkdown(user.sub, id);
      return { format: 'markdown', content: md };
    }
    return this.pages.exportPageJson(user.sub, id);
  }

  // ========== PAGE PERMISSION OVERRIDES ==========

  @Get(':id/permissions')
  @RequirePermission('pages', 'admin')
  async getPagePermissions(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.pages.getPagePermissions(user.sub, id);
  }

  @Put(':id/permissions')
  @RequirePermission('pages', 'admin')
  async updatePagePermissions(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = pagePermissionOverrideSchema.parse(body);
    return this.pages.updatePagePermissions(user.sub, id, dto.permissions);
  }

  // ========== PAGE VERSIONS ==========

  @Get(':id/versions')
  @RequirePermission('pages', 'read')
  async getPageVersions(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.pages.getPageVersions(user.sub, id);
  }

  @Post(':id/versions/:version/restore')
  @RequirePermission('pages', 'update')
  async restorePageVersion(
    @Param('id') id: string,
    @Param('version') version: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pages.restorePageVersion(user.sub, id, parseInt(version));
  }

  // ========== BLOCKS ==========

  @Post(':id/blocks')
  @RequirePermission('pages', 'update')
  async addBlock(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createBlockSchema.parse(body);
    return this.pages.addBlock(user.sub, id, dto);
  }

  @Put(':id/blocks/reorder')
  @HttpCode(200)
  @RequirePermission('pages', 'update')
  async reorderBlocks(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = reorderBlocksSchema.parse(body);
    return this.pages.reorderBlocks(user.sub, id, dto);
  }

  @Put(':id/blocks/:blockId')
  @RequirePermission('pages', 'update')
  async updateBlock(
    @Param('id') id: string, @Param('blockId') blockId: string,
    @Body() body: unknown, @CurrentUser() user: JwtPayload,
  ) {
    const dto = updateBlockSchema.parse(body);
    return this.pages.updateBlock(user.sub, id, blockId, dto);
  }

  @Delete(':id/blocks/:blockId')
  @HttpCode(204)
  @RequirePermission('pages', 'update')
  async deleteBlock(@Param('id') id: string, @Param('blockId') blockId: string, @CurrentUser() user: JwtPayload) {
    await this.pages.deleteBlock(user.sub, id, blockId);
  }

  // ========== BLOCK VERSIONS ==========

  @Get(':id/blocks/:blockId/versions')
  @RequirePermission('pages', 'read')
  async getBlockVersions(
    @Param('id') id: string,
    @Param('blockId') blockId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pages.getBlockVersions(user.sub, id, blockId);
  }

  @Post(':id/blocks/:blockId/versions/:version/restore')
  @RequirePermission('pages', 'update')
  async restoreBlockVersion(
    @Param('id') id: string,
    @Param('blockId') blockId: string,
    @Param('version') version: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pages.restoreBlockVersion(user.sub, id, blockId, parseInt(version));
  }

  // ========== PAGE RELATIONS ==========

  @Post(':id/relations')
  @RequirePermission('pages', 'update')
  async createRelation(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = createRelationSchema.parse(body);
    return this.pages.createRelation(user.sub, id, dto);
  }

  @Get(':id/relations')
  @RequirePermission('pages', 'read')
  async getRelations(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.pages.getRelations(user.sub, id);
  }

  @Delete('relations/:relationId')
  @HttpCode(204)
  @RequirePermission('pages', 'update')
  async deleteRelation(@Param('relationId') relationId: string, @CurrentUser() user: JwtPayload) {
    await this.pages.deleteRelation(user.sub, relationId);
  }

  // ========== TEMPLATES ==========

  @Get('templates/list')
  @RequirePermission('pages', 'read')
  async listTemplates() {
    return this.pages.listTemplates();
  }

  @Post('templates')
  @RequirePermission('pages', 'create')
  async createTemplate(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createTemplateSchema.parse(body);
    return this.pages.createTemplate(user.sub, dto);
  }

  @Get('templates/:templateId')
  @RequirePermission('pages', 'read')
  async getTemplate(@Param('templateId') templateId: string) {
    return this.pages.getTemplate(templateId);
  }

  @Put('templates/:templateId')
  @RequirePermission('pages', 'update')
  async updateTemplate(@Param('templateId') templateId: string, @Body() body: unknown) {
    const dto = updateTemplateSchema.parse(body);
    return this.pages.updateTemplate(templateId, dto);
  }

  @Delete('templates/:templateId')
  @HttpCode(204)
  @RequirePermission('pages', 'delete')
  async deleteTemplate(@Param('templateId') templateId: string) {
    await this.pages.deleteTemplate(templateId);
  }

  // ========== RESEARCH WORKSPACE ==========

  @Post(':id/research-sessions')
  @RequirePermission('pages', 'update')
  async createResearchSession(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = createResearchSessionSchema.parse({ ...body, pageId: id });
    return this.pages.createResearchSession(user.sub, dto);
  }

  @Get(':id/research-sessions')
  @RequirePermission('pages', 'read')
  async getResearchSessions(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.pages.getResearchSessions(user.sub, id);
  }

  @Put('research-sessions/:sessionId')
  @RequirePermission('pages', 'update')
  async updateResearchSession(
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = updateResearchSessionSchema.parse(body);
    return this.pages.updateResearchSession(user.sub, sessionId, dto);
  }

  @Delete('research-sessions/:sessionId')
  @HttpCode(204)
  @RequirePermission('pages', 'delete')
  async deleteResearchSession(@Param('sessionId') sessionId: string, @CurrentUser() user: JwtPayload) {
    await this.pages.deleteResearchSession(user.sub, sessionId);
  }

  // ========== RESEARCH SOURCES ==========

  @Post('research-sessions/:sessionId/sources')
  @RequirePermission('pages', 'update')
  async addResearchSource(
    @Param('sessionId') sessionId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = createResearchSourceSchema.parse({ ...body, sessionId });
    return this.pages.addResearchSource(user.sub, dto);
  }

  @Get('research-sessions/:sessionId/sources')
  @RequirePermission('pages', 'read')
  async getResearchSources(@Param('sessionId') sessionId: string, @CurrentUser() user: JwtPayload) {
    return this.pages.getResearchSources(user.sub, sessionId);
  }

  @Delete('research-sources/:sourceId')
  @HttpCode(204)
  @RequirePermission('pages', 'update')
  async deleteResearchSource(@Param('sourceId') sourceId: string, @CurrentUser() user: JwtPayload) {
    await this.pages.deleteResearchSource(user.sub, sourceId);
  }

  @Put('research-sources/:sourceId/pin')
  @RequirePermission('pages', 'update')
  async togglePinSource(
    @Param('sourceId') sourceId: string,
    @Body() body: { isPinned: boolean },
    @CurrentUser() user: JwtPayload,
  ) {
    await this.pages.togglePinSource(user.sub, sourceId, body.isPinned);
  }

  // ========== RESEARCH COLLECTIONS ==========

  @Post('research-sessions/:sessionId/collections')
  @RequirePermission('pages', 'update')
  async createResearchCollection(
    @Param('sessionId') sessionId: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = createResearchCollectionSchema.parse({ ...body, sessionId });
    return this.pages.createResearchCollection(user.sub, dto);
  }

  @Get('research-sessions/:sessionId/collections')
  @RequirePermission('pages', 'read')
  async getResearchCollections(@Param('sessionId') sessionId: string, @CurrentUser() user: JwtPayload) {
    return this.pages.getResearchCollections(user.sub, sessionId);
  }

  @Put('research-collections/:collectionId')
  @RequirePermission('pages', 'update')
  async updateResearchCollection(
    @Param('collectionId') collectionId: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pages.updateResearchCollection(user.sub, collectionId, body as any);
  }

  @Delete('research-collections/:collectionId')
  @HttpCode(204)
  @RequirePermission('pages', 'delete')
  async deleteResearchCollection(@Param('collectionId') collectionId: string, @CurrentUser() user: JwtPayload) {
    await this.pages.deleteResearchCollection(user.sub, collectionId);
  }

  // ========== BROWSER TABS ==========

  @Get('research-sessions/:sessionId/tabs')
  @RequirePermission('pages', 'read')
  async getBrowserTabs(@Param('sessionId') sessionId: string) {
    return this.pages.getBrowserTabs(sessionId);
  }

  @Post('research-sessions/:sessionId/tabs')
  @RequirePermission('pages', 'update')
  async createBrowserTab(@Param('sessionId') sessionId: string, @Body() body: { url?: string; title?: string }) {
    return this.pages.createBrowserTab(sessionId, body);
  }

  @Put('browser-tabs/:tabId')
  @RequirePermission('pages', 'update')
  async updateBrowserTab(@Param('tabId') tabId: string, @Body() body: { url?: string; title?: string; isActive?: boolean }) {
    return this.pages.updateBrowserTab(tabId, body);
  }

  @Delete('browser-tabs/:tabId')
  @HttpCode(204)
  @RequirePermission('pages', 'update')
  async deleteBrowserTab(@Param('tabId') tabId: string) {
    await this.pages.deleteBrowserTab(tabId);
  }

  @Post('research-sessions/:sessionId/tabs/:tabId/activate')
  @HttpCode(200)
  @RequirePermission('pages', 'update')
  async setActiveBrowserTab(@Param('sessionId') sessionId: string, @Param('tabId') tabId: string) {
    await this.pages.setActiveBrowserTab(sessionId, tabId);
  }

  // ========== WEB PROXY (for research browser) ==========

  @Get('proxy')
  @RequirePermission('pages', 'read')
  async proxyWebPage(@Query('url') url: string) {
    // Simple proxy to bypass CORS for the research browser iframe
    if (!url || !url.startsWith('http')) {
      throw new BadRequestException('Ungültige URL');
    }
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LifeHub/1.0)',
      },
    });
    const text = await response.text();
    // Return HTML with rewritten relative URLs to absolute
    const base = new URL(url);
    const proxied = text
      .replace(/src="\//g, `src="${base.origin}/`)
      .replace(/href="\//g, `href="${base.origin}/`)
      .replace(/src='\//g, `src='${base.origin}/`)
      .replace(/href='\//g, `href='${base.origin}/`);
    return proxied;
  }
}
