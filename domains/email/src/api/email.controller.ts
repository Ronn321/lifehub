import {
  Body, Controller, Get, Inject, Param, Post, Query, Res, UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtGuard, CurrentUser, type JwtPayload } from '@lifehub/auth';
import { RequirePermission, PermissionGuard } from '@lifehub/permissions';
import { GmailService } from '../services/gmail.service';
import {
  sendEmailSchema,
  replySchema,
  forwardSchema,
  modifyThreadSchema,
} from '../dtos/email.dto';

@UseGuards(JwtGuard, PermissionGuard)
@Controller('email')
export class EmailController {
  constructor(@Inject(GmailService) private readonly gmail: GmailService) {}

  @Get('status')
  @RequirePermission('email', 'read')
  async getStatus(@CurrentUser() user: JwtPayload) {
    return this.gmail.getStatus(user.sub);
  }

  @Get('threads')
  @RequirePermission('email', 'read')
  async listThreads(
    @CurrentUser() user: JwtPayload,
    @Query('labelId') labelId?: string,
    @Query('pageToken') pageToken?: string,
    @Query('maxResults') maxResults?: string,
    @Query('q') q?: string,
  ) {
    return this.gmail.listThreads(user.sub, {
      labelId,
      pageToken,
      maxResults: maxResults ? Number(maxResults) : undefined,
      q,
    });
  }

  @Get('threads/:id')
  @RequirePermission('email', 'read')
  async getThread(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.gmail.getThread(user.sub, id);
  }

  @Post('send')
  @RequirePermission('email', 'create')
  async send(@Body() body: unknown, @CurrentUser() user: JwtPayload) {
    const dto = sendEmailSchema.parse(body);
    return this.gmail.send(user.sub, dto);
  }

  @Post('reply/:threadId')
  @RequirePermission('email', 'create')
  async reply(
    @Param('threadId') threadId: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = replySchema.parse(body);
    return this.gmail.reply(user.sub, threadId, dto);
  }

  @Post('forward/:messageId')
  @RequirePermission('email', 'create')
  async forward(
    @Param('messageId') messageId: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = forwardSchema.parse(body);
    return this.gmail.forward(user.sub, messageId, dto);
  }

  @Post('threads/:id/modify')
  @RequirePermission('email', 'update')
  async modifyThread(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: JwtPayload,
  ) {
    const dto = modifyThreadSchema.parse(body);
    return this.gmail.modifyThread(user.sub, id, dto);
  }

  @Get('messages/:messageId/attachments/:attachmentId')
  @RequirePermission('email', 'read')
  async getAttachment(
    @Param('messageId') messageId: string,
    @Param('attachmentId') attachmentId: string,
    @Query('filename') filename: string | undefined,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const att = await this.gmail.getAttachment(user.sub, messageId, attachmentId);
    const name = filename || att.filename;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    );
    res.send(att.data);
  }
}
