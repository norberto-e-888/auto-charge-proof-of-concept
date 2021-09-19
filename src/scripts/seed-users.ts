import { connect, InsertOneWriteOpResult } from 'mongodb';
import * as faker from 'faker';
import { Types } from 'mongoose';
import { config } from 'dotenv';
import Stripe from 'stripe';

config();

async function seedUsers() {
  const stripe = new Stripe(process.env.STRIPE_SECRET, {
    apiVersion: '2020-08-27',
  });

  const connection = await connect('mongodb://localhost', {
    useUnifiedTopology: true,
  });

  const db = connection.db('meratas_poc');
  const [_, __, numberOfUsers] = process.argv;
  if (!numberOfUsers) {
    throw new Error(
      'Please provide the number of users you want the collection to be seeded with.',
    );
  }

  const parsedNumberOfUsers = parseFloat(numberOfUsers);
  const roundedNumberOfUsers = Math.floor(parsedNumberOfUsers);
  if (Number.isNaN(parsedNumberOfUsers) || roundedNumberOfUsers <= 0) {
    throw new Error(
      'Number of users must be a positive number that does not round down to zero!',
    );
  }

  if (parsedNumberOfUsers !== roundedNumberOfUsers) {
    console.warn('Your input for number of users was rounded down.');
  }

  const bulkWritePromises: Promise<
    InsertOneWriteOpResult<unknown & { _id: Types.ObjectId }>
  >[] = [];

  for (let i = 0; i < roundedNumberOfUsers; i++) {
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    const stripeCustomer = await stripe.customers.create({
      name: `${firstName} ${lastName}`,
    });

    bulkWritePromises.push(
      db.collection('users').insertOne({
        firstName,
        lastName,
        stripeReference: stripeCustomer.id,
      }),
    );
  }

  await Promise.all(bulkWritePromises);
}

seedUsers()
  .then(() => {
    console.log('Users successfully seeded.');
    process.exit();
  })
  .catch((err) => {
    console.error(err);
    process.exit();
  });
