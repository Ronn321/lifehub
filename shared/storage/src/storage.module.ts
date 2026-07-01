import { Module, Global } from '@nestjs/common';
import { LocalDiskStorage } from './local-disk.storage.js';
import { STORAGE_SERVICE } from './storage.interface.js';

@Global()
@Module({
  providers: [
    LocalDiskStorage,
    { provide: STORAGE_SERVICE, useExisting: LocalDiskStorage },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
