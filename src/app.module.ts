import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AutoPaymentsService } from './cron/auto-payment';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/meratas_poc'),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService, AutoPaymentsService],
})
export class AppModule {}
