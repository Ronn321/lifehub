"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbModule = exports.closeDb = exports.getDb = exports.DB_TOKEN = exports.DbService = void 0;
const common_1 = require("@nestjs/common");
const db_service_js_1 = require("./db.service.js");
const client_js_1 = require("./client.js");
var db_service_js_2 = require("./db.service.js");
Object.defineProperty(exports, "DbService", { enumerable: true, get: function () { return db_service_js_2.DbService; } });
var client_js_2 = require("./client.js");
Object.defineProperty(exports, "DB_TOKEN", { enumerable: true, get: function () { return client_js_2.DB_TOKEN; } });
var client_js_3 = require("./client.js");
Object.defineProperty(exports, "getDb", { enumerable: true, get: function () { return client_js_3.getDb; } });
Object.defineProperty(exports, "closeDb", { enumerable: true, get: function () { return client_js_3.closeDb; } });
// Factory-Provider, der DbService ohne @Injectable instantiiert.
class DbServiceFactory {
    instance = null;
    getInstance() {
        if (!this.instance) {
            this.instance = new db_service_js_1.DbService((0, client_js_1.getDb)());
        }
        return this.instance;
    }
}
let DbModule = class DbModule {
};
exports.DbModule = DbModule;
exports.DbModule = DbModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            DbServiceFactory,
            {
                provide: client_js_1.DB_TOKEN,
                useFactory: (f) => f.getInstance(),
                inject: [DbServiceFactory],
            },
            {
                provide: db_service_js_1.DbService,
                useFactory: (f) => f.getInstance(),
                inject: [DbServiceFactory],
            },
        ],
        exports: [db_service_js_1.DbService, client_js_1.DB_TOKEN],
    })
], DbModule);
//# sourceMappingURL=db.module.js.map