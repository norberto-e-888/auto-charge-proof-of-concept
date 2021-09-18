import { connect, InsertOneWriteOpResult } from 'mongodb';
import * as faker from 'faker';
import { Types } from 'mongoose';
import { ContractDocument } from 'src/models/contract.model';

async function seedEmployments() {
  const connection = await connect('mongodb://localhost', {
    useUnifiedTopology: true,
  });

  const db = connection.db('meratas_poc');
  const contracts: ContractDocument[] = await db
    .collection('contracts')
    .find()
    .toArray();

  const bulkWritePromises: Promise<
    InsertOneWriteOpResult<unknown & { _id: Types.ObjectId }>
  >[] = [];

  contracts.forEach(({ _id, user }) => {
    // random noop to ensure not all contracts have employments (AKA the student is employed or not)
    // 50/50 chance
    if (Math.random() > 0.5) {
      const salary = faker.commerce.price(20000, 500000, 0);
      bulkWritePromises.push(
        db.collection('employments').insertOne({
          user,
          contract: _id,
          salary,
        }),
      );
    }
  });

  await Promise.all(bulkWritePromises);
}

seedEmployments()
  .then(() => {
    console.log('Employments successfully seeded.');
    process.exit();
  })
  .catch((err) => {
    console.error(err);
    process.exit();
  });
