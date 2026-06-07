import { Module } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ConversationsService } from './conversations.service';
import { ToolingChatController } from './tooling-chat.controller';
import { ToolingChatService } from './tooling-chat.service';

@Module({
  controllers: [ToolingChatController],
  providers: [FirebaseService, ConversationsService, ToolingChatService],
})
export class ToolingChatModule {}
