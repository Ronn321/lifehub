"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var LocalDiskStorage_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalDiskStorage = void 0;
const common_1 = require("@nestjs/common");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const promises_1 = require("node:stream/promises");
const node_crypto_1 = require("node:crypto");
/**
 * LocalDisk-Storage-Adapter.
 * Basis-Verzeichnis aus STORAGE_BASE_PATH oder System-Settings.
 * In Production wird das NAS-Mount in diesen Pfad gemountet.
 */
let LocalDiskStorage = LocalDiskStorage_1 = class LocalDiskStorage {
    logger = new common_1.Logger(LocalDiskStorage_1.name);
    signingSecret = process.env.STORAGE_SIGNING_SECRET ?? 'dev-only-change-me';
    getBase() {
        return (0, node_path_1.resolve)(process.env.STORAGE_BASE_PATH ?? './storage');
    }
    resolveKey(domain, key) {
        if (key.includes('..') || key.startsWith('/')) {
            throw new Error(`Invalid key: ${key}`);
        }
        return (0, node_path_1.join)(this.getBase(), domain, key);
    }
    async put(domain, key, data) {
        const full = this.resolveKey(domain, key);
        await node_fs_1.promises.mkdir((0, node_path_1.dirname)(full), { recursive: true });
        if (Buffer.isBuffer(data)) {
            await node_fs_1.promises.writeFile(full, data);
        }
        else {
            await (0, promises_1.pipeline)(data, (0, node_fs_1.createWriteStream)(full));
        }
        this.logger.debug(`put: ${full}`);
        return full;
    }
    async get(path) {
        return (0, node_fs_1.createReadStream)(path);
    }
    async delete(path) {
        await node_fs_1.promises.rm(path, { force: true });
    }
    async exists(path) {
        try {
            await node_fs_1.promises.access(path);
            return true;
        }
        catch {
            return false;
        }
    }
    async stat(path) {
        const s = await node_fs_1.promises.stat(path);
        return { size: s.size, mtime: s.mtime };
    }
    async signedUrl(path, expiresInSeconds) {
        const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
        const sig = (0, node_crypto_1.createHmac)('sha256', this.signingSecret)
            .update(`${path}:${exp}`)
            .digest('hex')
            .slice(0, 32);
        return `/api/v1/storage/stream?path=${encodeURIComponent(path)}&exp=${exp}&sig=${sig}`;
    }
};
exports.LocalDiskStorage = LocalDiskStorage;
exports.LocalDiskStorage = LocalDiskStorage = LocalDiskStorage_1 = __decorate([
    (0, common_1.Injectable)()
], LocalDiskStorage);
//# sourceMappingURL=local-disk.storage.js.map