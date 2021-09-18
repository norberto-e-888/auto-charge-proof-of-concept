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
    const effectiveLoanAmount = faker.commerce.price(500, 75000, 0);
    const salaryPercentageOwed = Math.random();
    const minimumIncomeThreshold = faker.commerce.price(30000, 40000, 0);
    bulkWritePromises.push(
      db.collection('contracts').insertOne({
        user: _id,
        effectiveLoanAmount,
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
