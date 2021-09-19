import { connect, InsertOneWriteOpResult } from 'mongodb';
import * as faker from 'faker';
import { Types } from 'mongoose';
import { UserDocument } from 'src/models/user.model';

async function seedContracts() {
  const connection = await connect('mongodb://localhost', {
    useUnifiedTopology: true,
  });

  const db = connection.db('meratas_poc');
  const users: UserDocument[] = await db.collection('users').find().toArray();
  const bulkWritePromises: Promise<
    InsertOneWriteOpResult<unknown & { _id: Types.ObjectId }>
  >[] = [];

  users.forEach(({ _id }) => {
    const effectiveLoanAmount = faker.commerce.price(5000, 75000, 0);
    const salaryPercentageOwed =
      Math.floor(Math.random() * 0.15 * 100) / 100 + 0.05;

    const minimumIncomeThreshold = 50000;
    bulkWritePromises.push(
      db.collection('contracts').insertOne({
        user: _id,
        effectiveLoanAmount: parseInt(effectiveLoanAmount),
        salaryPercentageOwed,
        minimumIncomeThreshold,
      }),
    );
  });

  await Promise.all(bulkWritePromises);
}

seedContracts()
  .then(() => {
    console.log('Contracts successfully seeded.');
    process.exit();
  })
  .catch((err) => {
    console.error(err);
    process.exit();
  });
