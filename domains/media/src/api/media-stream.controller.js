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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaStreamController = void 0;
const common_1 = require("@nestjs/common");
const auth_1 = require("@lifehub/auth");
const media_service_1 = require("../services/media.service");
const fs = __importStar(require("fs"));
const corsOrigins = (process.env.CORS_ORIGINS ?? '').replace(/'/g, '');
function resolveOrigin(reqOrigin) {
    if (corsOrigins === '*')
        return '*';
    const configured = corsOrigins.split(',')[0]?.trim();
    return configured || reqOrigin || 'http://localhost:3001';
}
const CORS_HEADERS = (req) => ({
    'Access-Control-Allow-Origin': resolveOrigin(req.headers.origin),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
    'Cross-Origin-Resource-Policy': 'cross-origin',
});
/**
 * Unguarded controller for media streaming.
 * Auth via ?token= query param (since `<video>`/`<img>` tags can't set Authorization header).
 * Supports HTTP Range requests required by `<video>` elements.
 * Manual CORS headers because `@Res()` bypasses NestJS pipeline.
 */
let MediaStreamController = class MediaStreamController {
    media;
    constructor(media) {
        this.media = media;
    }
    async streamFile(id, res, req, token) {
        // Auth from query token
        if (!token)
            throw new common_1.UnauthorizedException('Missing token parameter');
        let payload;
        try {
            payload = await (0, auth_1.verifyAccessToken)(token);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
        const { filePath, mimeType, filename, fileSize } = await this.media.getFileStreamInfo(payload.sub, id);
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0] || '0', 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;
            const stream = fs.createReadStream(filePath, { start, end });
            res.writeHead(206, {
                ...CORS_HEADERS,
                'Content-Range': 'bytes ' + start + '-' + end + '/' + fileSize,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': mimeType,
                'Content-Disposition': 'inline; filename="' + filename + '"',
            });
            stream.pipe(res);
        }
        else {
            const stream = fs.createReadStream(filePath);
            res.writeHead(200, {
                ...CORS_HEADERS,
                'Content-Type': mimeType,
                'Content-Disposition': 'inline; filename="' + filename + '"',
                'Accept-Ranges': 'bytes',
                'Content-Length': fileSize,
            });
            stream.pipe(res);
        }
    }
};
exports.MediaStreamController = MediaStreamController;
__decorate([
    (0, common_1.Get)('files/:id/stream'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String]),
    __metadata("design:returntype", Promise)
], MediaStreamController.prototype, "streamFile", null);
exports.MediaStreamController = MediaStreamController = __decorate([
    (0, common_1.Controller)('media'),
    __param(0, (0, common_1.Inject)(media_service_1.MediaService)),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaStreamController);
//# sourceMappingURL=media-stream.controller.js.map