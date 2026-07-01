import { Module } from '@nestjs/common';
import { ProjectsService } from '../services/projects.service';
import { ProjectsRepository } from '../repositories/projects.repository';
import { ProjectsController } from './projects.controller';

@Module({
  providers: [ProjectsRepository, ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
