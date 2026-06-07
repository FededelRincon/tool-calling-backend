import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ToolingChatModule } from './tooling-chat/tooling-chat.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ToolingChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
