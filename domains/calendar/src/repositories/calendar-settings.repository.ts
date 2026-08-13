import { Inject } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DbService, calendarUserSettings, type Db } from '@lifehub/db';
import type { UpdateCalendarSettingsInput } from '../dtos/calendar.dto';
import type { CalendarUserSettings } from '../entities/calendar';

const DEFAULTS: Omit<CalendarUserSettings, 'ownerId'> = {
  accentColor: null,
  backgroundUrl: null,
  backgroundOverlay: 0.85,
  backgroundBlur: 12,
  defaultView: 'month',
  weekStart: 'monday',
  showWeekNumbers: true,
};

function mapRow(ownerId: string, row: {
  accentColor: string | null;
  backgroundUrl: string | null;
  backgroundOverlay: number;
  backgroundBlur: number;
  defaultView: string;
  weekStart: string;
  showWeekNumbers: boolean;
}): CalendarUserSettings {
  return {
    ownerId,
    accentColor: row.accentColor,
    backgroundUrl: row.backgroundUrl,
    backgroundOverlay: row.backgroundOverlay,
    backgroundBlur: row.backgroundBlur,
    defaultView: (row.defaultView as CalendarUserSettings['defaultView']) ?? 'month',
    weekStart: (row.weekStart as CalendarUserSettings['weekStart']) ?? 'monday',
    showWeekNumbers: row.showWeekNumbers,
  };
}

export class CalendarSettingsRepository {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  private get db(): Db {
    return this.dbService.db;
  }

  async getSettings(ownerId: string): Promise<CalendarUserSettings> {
    const [row] = await this.db.select().from(calendarUserSettings)
      .where(eq(calendarUserSettings.ownerId, ownerId));
    if (!row) return { ownerId, ...DEFAULTS };
    return mapRow(ownerId, row);
  }

  async updateSettings(ownerId: string, input: UpdateCalendarSettingsInput): Promise<CalendarUserSettings> {
    const [row] = await this.db.insert(calendarUserSettings)
      .values({ ownerId, ...input, updatedAt: sql`now()` })
      .onConflictDoUpdate({
        target: calendarUserSettings.ownerId,
        set: { ...input, updatedAt: sql`now()` },
      })
      .returning();
    if (!row) return { ownerId, ...DEFAULTS };
    return mapRow(ownerId, row);
  }
}
