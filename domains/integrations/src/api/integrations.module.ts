import { Module } from '@nestjs/common';
import { GoogleConnectionService } from '../services/google-connection.service';
import { GoogleConnectionRepository } from '../repositories/google-connection.repository';
import { GoogleIntegrationController } from './google-integration.controller';

@Module({
  providers: [GoogleConnectionRepository, GoogleConnectionService],
  controllers: [GoogleIntegrationController],
  exports: [GoogleConnectionService],
})
export class IntegrationsModule {}
