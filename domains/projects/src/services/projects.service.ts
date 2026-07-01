import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ProjectsRepository } from '../repositories/projects.repository';
import type { CreateProjectInput, UpdateProjectInput, CreateNoteInput, UpdateNoteInput, CreateLinkInput } from '../dtos/projects.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly repo: ProjectsRepository) {}

  async createProject(ownerId: string, input: CreateProjectInput) {
    return this.repo.createProject({ ...input, ownerId });
  }

  async listProjects(ownerId: string) {
    const projectList = await this.repo.findProjectsByOwner(ownerId);
    const enriched = await Promise.all(projectList.map(async (project) => {
      const [files, notes, links] = await Promise.all([
        this.repo.findFilesByProject(project.id),
        this.repo.findNotesByProject(project.id),
        this.repo.findLinksByProject(project.id),
      ]);
      return { ...project, files, notes, links };
    }));
    return enriched;
  }

  async getProjectWithDetails(ownerId: string, id: string) {
    const project = await this.repo.findProjectById(id, ownerId);
    if (!project) throw new NotFoundException('Projekt nicht gefunden');
    const [files, notes, links] = await Promise.all([
      this.repo.findFilesByProject(id),
      this.repo.findNotesByProject(id),
      this.repo.findLinksByProject(id),
    ]);
    return { ...project, files, notes, links };
  }

  async updateProject(ownerId: string, id: string, input: UpdateProjectInput) {
    const project = await this.repo.findProjectById(id, ownerId);
    if (!project) throw new NotFoundException('Projekt nicht gefunden');
    return this.repo.updateProject(id, ownerId, input);
  }

  async deleteProject(ownerId: string, id: string) {
    const project = await this.repo.findProjectById(id, ownerId);
    if (!project) throw new NotFoundException('Projekt nicht gefunden');
    await this.repo.softDeleteProject(id, ownerId);
  }

  // ========== NOTES ==========

  async addNote(ownerId: string, projectId: string, input: CreateNoteInput) {
    const project = await this.repo.findProjectById(projectId, ownerId);
    if (!project) throw new NotFoundException('Projekt nicht gefunden');
    return this.repo.createNote({ projectId, ...input });
  }

  async updateNote(ownerId: string, projectId: string, noteId: string, input: UpdateNoteInput) {
    const project = await this.repo.findProjectById(projectId, ownerId);
    if (!project) throw new NotFoundException('Projekt nicht gefunden');
    const note = await this.repo.updateNote(noteId, projectId, input);
    if (!note) throw new NotFoundException('Notiz nicht gefunden');
    return note;
  }

  async deleteNote(ownerId: string, projectId: string, noteId: string) {
    const project = await this.repo.findProjectById(projectId, ownerId);
    if (!project) throw new NotFoundException('Projekt nicht gefunden');
    await this.repo.deleteNote(noteId, projectId);
  }

  // ========== LINKS ==========

  async addLink(ownerId: string, projectId: string, input: CreateLinkInput) {
    const project = await this.repo.findProjectById(projectId, ownerId);
    if (!project) throw new NotFoundException('Projekt nicht gefunden');
    return this.repo.createLink({ projectId, ...input });
  }

  async deleteLink(ownerId: string, projectId: string, linkId: string) {
    const project = await this.repo.findProjectById(projectId, ownerId);
    if (!project) throw new NotFoundException('Projekt nicht gefunden');
    await this.repo.deleteLink(linkId, projectId);
  }
}
