import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AutoPaymentModule } from './auto-payment/auto-payment.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost/meratas_poc'),
    ScheduleModule.forRoot(),
    AutoPaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
