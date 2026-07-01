"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventType = createEventType;
function createEventType(name) {
    return {
        name,
        create(aggregateId, payload) {
            return { type: name, occurredAt: new Date().toISOString(), aggregateId, payload };
        },
    };
}
//# sourceMappingURL=event-type.js.map