import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TravelRepository } from '../repositories/travel.repository';
import type { CreateTripInput, UpdateTripInput, AddMediaToTripInput, CreateDestinationInput, CreateTripDayInput } from '../dtos/travel.dto';

@Injectable()
export class TravelService {
  private readonly logger = new Logger(TravelService.name);

  constructor(private readonly repo: TravelRepository) {}

  async createTrip(ownerId: string, input: CreateTripInput) {
    if (new Date(input.endDate) < new Date(input.startDate)) {
      throw new BadRequestException('End date must be after start date');
    }
    return this.repo.createTrip({ ...input, ownerId });
  }

  async listTrips(ownerId: string) {
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

  async getTripWithDetails(ownerId: string, id: string) {
    const trip = await this.repo.findTripById(id, ownerId);
    if (!trip) throw new NotFoundException('Trip not found');
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

  async updateTrip(ownerId: string, id: string, input: UpdateTripInput) {
    const trip = await this.repo.findTripById(id, ownerId);
    if (!trip) throw new NotFoundException('Trip not found');
    return this.repo.updateTrip(id, ownerId, input);
  }

  async deleteTrip(ownerId: string, id: string) {
    const trip = await this.repo.findTripById(id, ownerId);
    if (!trip) throw new NotFoundException('Trip not found');
    await this.repo.softDeleteTrip(id, ownerId);
  }

  async addMediaToTrip(ownerId: string, tripId: string, input: AddMediaToTripInput) {
    const trip = await this.repo.findTripById(tripId, ownerId);
    if (!trip) throw new NotFoundException('Trip not found');
    const { dayId, ...rest } = input;
    return this.repo.addMediaRef({ tripId, ...rest, dayId: dayId ?? null });
  }

  async addDestination(ownerId: string, tripId: string, input: CreateDestinationInput) {
    const trip = await this.repo.findTripById(tripId, ownerId);
    if (!trip) throw new NotFoundException('Trip not found');
    return this.repo.createDestination({ tripId, ...input });
  }

  async deleteDestination(ownerId: string, tripId: string, destId: string) {
    const trip = await this.repo.findTripById(tripId, ownerId);
    if (!trip) throw new NotFoundException('Trip not found');
    await this.repo.deleteDestination(destId, tripId);
  }

  async addTripDay(ownerId: string, tripId: string, input: CreateTripDayInput) {
    const trip = await this.repo.findTripById(tripId, ownerId);
    if (!trip) throw new NotFoundException('Trip not found');
    return this.repo.createTripDay({ tripId, date: input.dayDate, title: input.title, notes: input.notes });
  }

  async deleteTripDay(ownerId: string, tripId: string, dayId: string) {
    const trip = await this.repo.findTripById(tripId, ownerId);
    if (!trip) throw new NotFoundException('Trip not found');
    await this.repo.deleteTripDay(dayId, tripId);
  }

  async addMediaToDay(ownerId: string, tripId: string, dayId: string, input: AddMediaToTripInput) {
    const trip = await this.repo.findTripById(tripId, ownerId);
    if (!trip) throw new NotFoundException('Trip not found');
    const days = await this.repo.findDaysByTrip(tripId);
    const day = days.find((d) => d.id === dayId);
    if (!day) throw new NotFoundException('Trip day not found');
    const { dayId: _, ...rest } = input;
    return this.repo.addMediaRef({ tripId, dayId, ...rest });
  }
}
