import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type Processor, type Job, type ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import type { DomainEvent } from './event-type.js';

const QUEUE_NAME = 'lifehub-domain-events';

@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private _redis: Redis | null = null;
  private _queue: Queue<DomainEvent> | null = null;

  private get redis(): Redis {
    if (!this._redis) {
      const url = process.env.REDIS_URL;
      if (!url) throw new Error('REDIS_URL not set');
      this._redis = new Redis(url, { maxRetriesPerRequest: null });
    }
    return this._redis;
  }

  private get queue(): Queue<DomainEvent> {
    if (!this._queue) {
      this._queue = new Queue<DomainEvent>(QUEUE_NAME, { connection: this.redis as ConnectionOptions });
    }
    return this._queue;
  }

  async emit(event: DomainEvent): Promise<void> {
    await this.queue.add(event.type, event, {
      removeOnComplete: 100,
      removeOnFail: 1000,
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
    });
    this.logger.debug(`emit ${event.type} (${event.aggregateId})`);
  }

  /** Phase 0: Stub. Phase 1+: Worker mit Search-Indexer, Notifications, etc. */
  startConsumer(processor: Processor<DomainEvent>): Worker<DomainEvent> {
    return new Worker<DomainEvent>(QUEUE_NAME, processor, { connection: this.redis as ConnectionOptions });
  }

  async onModuleDestroy(): Promise<void> {
    await this._queue?.close();
    await this._redis?.quit();
  }
}
