"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelRepository = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("@lifehub/db");
let TravelRepository = class TravelRepository {
    dbService;
    constructor(dbService) {
        this.dbService = dbService;
    }
    get db() {
        return this.dbService.db;
    }
    // ========== TRIPS ==========
    async createTrip(data) {
        const [row] = await this.db.insert(db_1.trips).values({
            ownerId: data.ownerId, title: data.title,
            description: data.description ?? null, startDate: data.startDate,
            endDate: data.endDate, coverMediaId: data.coverMediaId ?? null,
            status: data.status ?? 'planned',
        }).returning();
        return row;
    }
    async findTripsByOwner(ownerId) {
        return this.db.select().from(db_1.trips)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.trips.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.trips.deletedAt)))
            .orderBy((0, drizzle_orm_1.desc)(db_1.trips.startDate));
    }
    async findTripById(id, ownerId) {
        const [row] = await this.db.select().from(db_1.trips)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.trips.id, id), (0, drizzle_orm_1.eq)(db_1.trips.ownerId, ownerId), (0, drizzle_orm_1.isNull)(db_1.trips.deletedAt)));
        return row ?? null;
    }
    async updateTrip(id, ownerId, data) {
        const [row] = await this.db.update(db_1.trips)
            .set({ ...data, updatedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.trips.id, id), (0, drizzle_orm_1.eq)(db_1.trips.ownerId, ownerId)))
            .returning();
        return row ?? null;
    }
    async softDeleteTrip(id, ownerId) {
        await this.db.update(db_1.trips)
            .set({ deletedAt: (0, drizzle_orm_1.sql) `now()` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.trips.id, id), (0, drizzle_orm_1.eq)(db_1.trips.ownerId, ownerId)));
    }
    // ========== DESTINATIONS ==========
    async createDestination(data) {
        const [row] = await this.db.insert(db_1.destinations).values({
            tripId: data.tripId, name: data.name,
            lat: data.lat ?? null, lng: data.lng ?? null,
            ord: data.ord ?? 0,
        }).returning();
        return row;
    }
    async findDestinationsByTrip(tripId) {
        return this.db.select().from(db_1.destinations)
            .where((0, drizzle_orm_1.eq)(db_1.destinations.tripId, tripId))
            .orderBy((0, drizzle_orm_1.asc)(db_1.destinations.ord));
    }
    async countDestinationsByTrip(tripId) {
        const [result] = await this.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(db_1.destinations)
            .where((0, drizzle_orm_1.eq)(db_1.destinations.tripId, tripId));
        return Number(result?.count ?? 0);
    }
    async deleteDestination(id, tripId) {
        await this.db.delete(db_1.destinations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.destinations.id, id), (0, drizzle_orm_1.eq)(db_1.destinations.tripId, tripId)));
    }
    // ========== TRIP DAYS ==========
    async createTripDay(data) {
        const [row] = await this.db.insert(db_1.tripDays).values({
            tripId: data.tripId, date: data.date,
            title: data.title ?? null, notes: data.notes ?? null,
            ord: data.ord ?? 0,
        }).returning();
        return row;
    }
    async findDaysByTrip(tripId) {
        return this.db.select().from(db_1.tripDays)
            .where((0, drizzle_orm_1.eq)(db_1.tripDays.tripId, tripId))
            .orderBy((0, drizzle_orm_1.asc)(db_1.tripDays.date));
    }
    async countDaysByTrip(tripId) {
        const [result] = await this.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(db_1.tripDays)
            .where((0, drizzle_orm_1.eq)(db_1.tripDays.tripId, tripId));
        return Number(result?.count ?? 0);
    }
    async deleteTripDay(id, tripId) {
        await this.db.delete(db_1.tripDays)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.tripDays.id, id), (0, drizzle_orm_1.eq)(db_1.tripDays.tripId, tripId)));
    }
    // ========== MEDIA REFS ==========
    async addMediaRef(data) {
        const [row] = await this.db.insert(db_1.tripMediaRefs).values({
            tripId: data.tripId, mediaId: data.mediaId,
            dayId: data.dayId ?? null, caption: data.caption ?? null,
            ord: data.ord ?? 0,
        }).returning();
        return row;
    }
    async findMediaRefsByTrip(tripId) {
        return this.db.select().from(db_1.tripMediaRefs)
            .where((0, drizzle_orm_1.eq)(db_1.tripMediaRefs.tripId, tripId))
            .orderBy((0, drizzle_orm_1.asc)(db_1.tripMediaRefs.ord));
    }
    async countMediaRefsByTrip(tripId) {
        const [result] = await this.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(db_1.tripMediaRefs)
            .where((0, drizzle_orm_1.eq)(db_1.tripMediaRefs.tripId, tripId));
        return Number(result?.count ?? 0);
    }
    async findMediaRefsByDay(dayId) {
        return this.db.select().from(db_1.tripMediaRefs)
            .where((0, drizzle_orm_1.eq)(db_1.tripMediaRefs.dayId, dayId))
            .orderBy((0, drizzle_orm_1.asc)(db_1.tripMediaRefs.ord));
    }
};
exports.TravelRepository = TravelRepository;
exports.TravelRepository = TravelRepository = __decorate([
    __param(0, (0, common_1.Inject)(db_1.DbService)),
    __metadata("design:paramtypes", [db_1.DbService])
], TravelRepository);
//# sourceMappingURL=travel.repository.js.map