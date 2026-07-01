/**
 * Domain-Event-Typen werden pro Domain definiert.
 * Hier liegt nur das gemeinsame Schema.
 */
export interface DomainEvent<T = unknown> {
  type: string;
  occurredAt: string;     // ISO 8601
  aggregateId: string;
  payload: T;
}

export function createEventType<T>(name: string) {
  return {
    name,
    create(aggregateId: string, payload: T): DomainEvent<T> {
      return { type: name, occurredAt: new Date().toISOString(), aggregateId, payload };
    },
  };
}
