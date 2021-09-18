import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const STRIPE = 'STRIPE';
export const StripeProvider: Provider<Stripe> = {
  provide: STRIPE,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new Stripe(config.get('STRIPE_SECRET'), {
      apiVersion: '2020-08-27',
    }),
};
