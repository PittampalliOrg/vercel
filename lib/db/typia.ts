import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import typia from 'typia';
import { eq } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});


const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);


async function getUser(email: string) {
    return db.select().from(user).where(eq(user.email, email));
}

const paramSchema = typia.json.schemas<[Parameters<typeof getUser>], '3.1'>();

console.log(paramSchema)

//   returnSchema: typia.json.schemas<[Awaited<ReturnType<DbActions['getChatsByUserId']>>], '3.1'>()
