"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelModule = exports.TravelService = void 0;
__exportStar(require("./entities/travel"), exports);
__exportStar(require("./dtos/travel.dto"), exports);
var travel_service_1 = require("./services/travel.service");
Object.defineProperty(exports, "TravelService", { enumerable: true, get: function () { return travel_service_1.TravelService; } });
var travel_module_1 = require("./api/travel.module");
Object.defineProperty(exports, "TravelModule", { enumerable: true, get: function () { return travel_module_1.TravelModule; } });
//# sourceMappingURL=index.js.map