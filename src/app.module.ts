import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MonumentsService } from './monuments/monuments.service';
import {MonumentsModule} from "./monuments/monuments.module";

@Module({
  imports: [MonumentsModule],
  controllers: [AppController],
  providers: [AppService, MonumentsService],
})
export class AppModule {}
