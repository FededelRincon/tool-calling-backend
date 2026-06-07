import { Body, Controller, Post } from '@nestjs/common';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ToolingChatService } from './tooling-chat.service';

@Controller()
export class ToolingChatController {
  constructor(private readonly chat: ToolingChatService) {}

  @Post('tooling-chat')
  async handle(@Body() dto: ChatRequestDto) {
    return this.chat.chat(dto.message, dto.conversationId);
  }
}
