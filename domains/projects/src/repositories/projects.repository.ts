import { Inject } from '@nestjs/common';
import { and, eq, isNull, sql, desc, asc } from 'drizzle-orm';
import { DbService, projects, projectFiles, projectNotes, projectLinks, type Db } from '@lifehub/db';

export class ProjectsRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  // ========== PROJECTS ==========

  async createProject(data: {
    ownerId: string; title: string; description?: string;
    type?: string; status?: string; coverMediaId?: string | null;
    githubUrl?: string | null; youtubeUrl?: string | null;
  }) {
    const [row] = await this.db.insert(projects).values({
      ownerId: data.ownerId, title: data.title,
      description: data.description ?? null,
      type: data.type ?? 'planning',
      status: data.status ?? '3d_print',
      coverMediaId: data.coverMediaId ?? null,
      githubUrl: data.githubUrl ?? null,
      youtubeUrl: data.youtubeUrl ?? null,
    }).returning();
    return row;
  }

  async findProjectsByOwner(ownerId: string) {
    return this.db.select().from(projects)
      .where(and(eq(projects.ownerId, ownerId), isNull(projects.deletedAt)))
      .orderBy(desc(projects.createdAt));
  }

  async findProjectById(id: string, ownerId: string) {
    const [row] = await this.db.select().from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId), isNull(projects.deletedAt)));
    return row ?? null;
  }

  async updateProject(id: string, ownerId: string, data: Partial<{
    title: string; description: string | null; type: string; status: string;
    coverMediaId: string | null; githubUrl: string | null; youtubeUrl: string | null;
  }>) {
    const [row] = await this.db.update(projects)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
      .returning();
    return row ?? null;
  }

  async softDeleteProject(id: string, ownerId: string) {
    await this.db.update(projects)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)));
  }

  // ========== FILES ==========

  async createFile(data: {
    projectId: string; filename: string; mimeType?: string;
    fileSize?: number; storagePath?: string; kind?: string;
  }) {
    const [row] = await this.db.insert(projectFiles).values({
      projectId: data.projectId, filename: data.filename,
      mimeType: data.mimeType ?? null, fileSize: data.fileSize ?? null,
      storagePath: data.storagePath ?? null, kind: data.kind ?? 'other',
    }).returning();
    return row;
  }

  async findFilesByProject(projectId: string) {
    return this.db.select().from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(asc(projectFiles.createdAt));
  }

  // ========== NOTES ==========

  async createNote(data: { projectId: string; content: string }) {
    const [row] = await this.db.insert(projectNotes).values({
      projectId: data.projectId,
      content: data.content,
    }).returning();
    return row;
  }

  async findNotesByProject(projectId: string) {
    return this.db.select().from(projectNotes)
      .where(eq(projectNotes.projectId, projectId))
      .orderBy(asc(projectNotes.createdAt));
  }

  async updateNote(id: string, projectId: string, data: { content: string }) {
    const [row] = await this.db.update(projectNotes)
      .set({ ...data, updatedAt: sql`now()` })
      .where(and(eq(projectNotes.id, id), eq(projectNotes.projectId, projectId)))
      .returning();
    return row ?? null;
  }

  async deleteNote(id: string, projectId: string) {
    await this.db.delete(projectNotes)
      .where(and(eq(projectNotes.id, id), eq(projectNotes.projectId, projectId)));
  }

  // ========== LINKS ==========

  async createLink(data: {
    projectId: string; url: string; label?: string; type?: string;
  }) {
    const [row] = await this.db.insert(projectLinks).values({
      projectId: data.projectId, url: data.url,
      label: data.label ?? null, type: data.type ?? 'other',
    }).returning();
    return row;
  }

  async findLinksByProject(projectId: string) {
    return this.db.select().from(projectLinks)
      .where(eq(projectLinks.projectId, projectId))
      .orderBy(asc(projectLinks.createdAt));
  }

  async deleteLink(id: string, projectId: string) {
    await this.db.delete(projectLinks)
      .where(and(eq(projectLinks.id, id), eq(projectLinks.projectId, projectId)));
  }
}
