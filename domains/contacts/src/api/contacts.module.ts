import { Module } from '@nestjs/common';
import { ContactService } from '../services/contact.service';
import { ContactRepository } from '../repositories/contact.repository';
import { ContactController } from './contact.controller';

@Module({
  providers: [ContactRepository, ContactService],
  controllers: [ContactController],
  exports: [ContactService],
})
export class ContactsModule {}
