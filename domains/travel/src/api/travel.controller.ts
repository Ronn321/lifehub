import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { TravelService } from '../services/travel.service';
import { createTripSchema, updateTripSchema, addMediaToTripSchema, createDestinationSchema, createTripDaySchema } from '../dtos/travel.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('trips')
export class TravelController {
  constructor(@Inject(TravelService) private readonly travel: TravelService) {}

  @Post()
  @RequirePermission('travel', 'create')
  async createTrip(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createTripSchema.parse(body);
    return this.travel.createTrip(user.sub, dto);
  }

  @Get()
  @RequirePermission('travel', 'read')
  async listTrips(@CurrentUser() user: JwtPayload) {
    return this.travel.listTrips(user.sub);
  }

  @Get(':id')
  @RequirePermission('travel', 'read')
  async getTrip(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.travel.getTripWithDetails(user.sub, id);
  }

  @Put(':id')
  @RequirePermission('travel', 'update')
  async updateTrip(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = updateTripSchema.parse(body);
    return this.travel.updateTrip(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('travel', 'delete')
  async deleteTrip(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.travel.deleteTrip(user.sub, id);
  }

  @Post(':id/destinations')
  @RequirePermission('travel', 'update')
  async addDestination(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createDestinationSchema.parse(body);
    return this.travel.addDestination(user.sub, id, dto);
  }

  @Delete(':id/destinations/:destId')
  @HttpCode(204)
  @RequirePermission('travel', 'update')
  async deleteDestination(@Param('id') id: string, @Param('destId') destId: string, @CurrentUser() user: JwtPayload) {
    await this.travel.deleteDestination(user.sub, id, destId);
  }

  @Post(':id/days')
  @RequirePermission('travel', 'update')
  async addTripDay(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = createTripDaySchema.parse(body);
    return this.travel.addTripDay(user.sub, id, dto);
  }

  @Delete(':id/days/:dayId')
  @HttpCode(204)
  @RequirePermission('travel', 'update')
  async deleteTripDay(@Param('id') id: string, @Param('dayId') dayId: string, @CurrentUser() user: JwtPayload) {
    await this.travel.deleteTripDay(user.sub, id, dayId);
  }

  @Post(':id/media')
  @RequirePermission('travel', 'update')
  async addMediaToTrip(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = addMediaToTripSchema.parse(body);
    return this.travel.addMediaToTrip(user.sub, id, dto);
  }

  @Post(':id/days/:dayId/media')
  @RequirePermission('travel', 'update')
  async addMediaToDay(
    @Param('id') id: string, @Param('dayId') dayId: string,
    @Body() body: unknown, @CurrentUser() user: JwtPayload,
  ) {
    const dto = addMediaToTripSchema.parse(body);
    return this.travel.addMediaToDay(user.sub, id, dayId, dto);
  }
}
