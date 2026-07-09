"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const QUEUE_NAME = 'lifehub-domain-events';
let EventsService = EventsService_1 = class EventsService {
    logger = new common_1.Logger(EventsService_1.name);
    _redis = null;
    _queue = null;
    get redis() {
        if (!this._redis) {
            const url = process.env.REDIS_URL;
            if (!url)
                throw new Error('REDIS_URL not set');
            this._redis = new ioredis_1.Redis(url, { maxRetriesPerRequest: null });
        }
        return this._redis;
    }
    get queue() {
        if (!this._queue) {
            this._queue = new bullmq_1.Queue(QUEUE_NAME, { connection: this.redis });
        }
        return this._queue;
    }
    async emit(event) {
        await this.queue.add(event.type, event, {
            removeOnComplete: 100,
            removeOnFail: 1000,
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
        });
        this.logger.debug(`emit ${event.type} (${event.aggregateId})`);
    }
    /** Phase 0: Stub. Phase 1+: Worker mit Search-Indexer, Notifications, etc. */
    startConsumer(processor) {
        return new bullmq_1.Worker(QUEUE_NAME, processor, { connection: this.redis });
    }
    async onModuleDestroy() {
        await this._queue?.close();
        await this._redis?.quit();
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = EventsService_1 = __decorate([
    (0, common_1.Injectable)()
], EventsService);
//# sourceMappingURL=events.service.js.map