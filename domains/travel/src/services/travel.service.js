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
var TravelService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelService = void 0;
const common_1 = require("@nestjs/common");
const travel_repository_1 = require("../repositories/travel.repository");
let TravelService = TravelService_1 = class TravelService {
    repo;
    logger = new common_1.Logger(TravelService_1.name);
    constructor(repo) {
        this.repo = repo;
    }
    async createTrip(ownerId, input) {
        if (new Date(input.endDate) < new Date(input.startDate)) {
            throw new common_1.BadRequestException('End date must be after start date');
        }
        return this.repo.createTrip({ ...input, ownerId });
    }
    async listTrips(ownerId) {
        const trips = await this.repo.findTripsByOwner(ownerId);
        const enriched = await Promise.all(trips.map(async (trip) => {
            const [destinationCount, dayCount, mediaCount] = await Promise.all([
                this.repo.countDestinationsByTrip(trip.id),
                this.repo.countDaysByTrip(trip.id),
                this.repo.countMediaRefsByTrip(trip.id),
            ]);
            return { ...trip, destinationCount, dayCount, mediaCount, destinations: [] };
        }));
        return enriched;
    }
    async getTripWithDetails(ownerId, id) {
        const trip = await this.repo.findTripById(id, ownerId);
        if (!trip)
            throw new common_1.NotFoundException('Trip not found');
        const [destinations, days, mediaRefs, destinationCount, dayCount, mediaCount] = await Promise.all([
            this.repo.findDestinationsByTrip(id),
            this.repo.findDaysByTrip(id),
            this.repo.findMediaRefsByTrip(id),
            this.repo.countDestinationsByTrip(id),
            this.repo.countDaysByTrip(id),
            this.repo.countMediaRefsByTrip(id),
        ]);
        return { ...trip, destinations, days, mediaRefs, destinationCount, dayCount, mediaCount };
    }
    async updateTrip(ownerId, id, input) {
        const trip = await this.repo.findTripById(id, ownerId);
        if (!trip)
            throw new common_1.NotFoundException('Trip not found');
        return this.repo.updateTrip(id, ownerId, input);
    }
    async deleteTrip(ownerId, id) {
        const trip = await this.repo.findTripById(id, ownerId);
        if (!trip)
            throw new common_1.NotFoundException('Trip not found');
        await this.repo.softDeleteTrip(id, ownerId);
    }
    async addMediaToTrip(ownerId, tripId, input) {
        const trip = await this.repo.findTripById(tripId, ownerId);
        if (!trip)
            throw new common_1.NotFoundException('Trip not found');
        const { dayId, ...rest } = input;
        return this.repo.addMediaRef({ tripId, ...rest, dayId: dayId ?? null });
    }
    async addDestination(ownerId, tripId, input) {
        const trip = await this.repo.findTripById(tripId, ownerId);
        if (!trip)
            throw new common_1.NotFoundException('Trip not found');
        return this.repo.createDestination({ tripId, ...input });
    }
    async deleteDestination(ownerId, tripId, destId) {
        const trip = await this.repo.findTripById(tripId, ownerId);
        if (!trip)
            throw new common_1.NotFoundException('Trip not found');
        await this.repo.deleteDestination(destId, tripId);
    }
    async addTripDay(ownerId, tripId, input) {
        const trip = await this.repo.findTripById(tripId, ownerId);
        if (!trip)
            throw new common_1.NotFoundException('Trip not found');
        return this.repo.createTripDay({ tripId, date: input.dayDate, title: input.title, notes: input.notes });
    }
    async deleteTripDay(ownerId, tripId, dayId) {
        const trip = await this.repo.findTripById(tripId, ownerId);
        if (!trip)
            throw new common_1.NotFoundException('Trip not found');
        await this.repo.deleteTripDay(dayId, tripId);
    }
    async addMediaToDay(ownerId, tripId, dayId, input) {
        const trip = await this.repo.findTripById(tripId, ownerId);
        if (!trip)
            throw new common_1.NotFoundException('Trip not found');
        const days = await this.repo.findDaysByTrip(tripId);
        const day = days.find((d) => d.id === dayId);
        if (!day)
            throw new common_1.NotFoundException('Trip day not found');
        const { dayId: _, ...rest } = input;
        return this.repo.addMediaRef({ tripId, dayId, ...rest });
    }
};
exports.TravelService = TravelService;
exports.TravelService = TravelService = TravelService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [travel_repository_1.TravelRepository])
], TravelService);
//# sourceMappingURL=travel.service.js.map