"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPublicUser = toPublicUser;
function toPublicUser(u) {
    const { passwordHash: _ph, totpSecret: _ts, ...rest } = u;
    return rest;
}
//# sourceMappingURL=user.js.map