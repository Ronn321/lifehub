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
exports.closeDb = exports.getDb = exports.DB_TOKEN = exports.DbModule = exports.DbService = void 0;
// Re-exports — CommonJS mode (no .js extensions)
var db_module_js_1 = require("./db.module.js");
Object.defineProperty(exports, "DbService", { enumerable: true, get: function () { return db_module_js_1.DbService; } });
Object.defineProperty(exports, "DbModule", { enumerable: true, get: function () { return db_module_js_1.DbModule; } });
Object.defineProperty(exports, "DB_TOKEN", { enumerable: true, get: function () { return db_module_js_1.DB_TOKEN; } });
var client_js_1 = require("./client.js");
Object.defineProperty(exports, "getDb", { enumerable: true, get: function () { return client_js_1.getDb; } });
Object.defineProperty(exports, "closeDb", { enumerable: true, get: function () { return client_js_1.closeDb; } });
__exportStar(require("./schema/public.js"), exports);
//# sourceMappingURL=index.js.map