import { Module } from '@nestjs/common';
import { IntegrationsModule } from '@lifehub/integrations-domain';
import { GmailService } from '../services/gmail.service';
import { EmailController } from './email.controller';

@Module({
  imports: [IntegrationsModule],
  providers: [GmailService],
  controllers: [EmailController],
  exports: [GmailService],
})
export class EmailModule {}
