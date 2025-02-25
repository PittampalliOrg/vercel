import { db, dbActions } from "../../../../lib/db/queries";
import { vote, chat } from "../../../../lib/db/schema";
import { and, asc, desc, eq, gt, gte } from 'drizzle-orm';
import { logger } from "../../../../lib/logger";
import { createSelectSchema, BuildSchema } from "drizzle-zod";

const chatSelectSchema = createSelectSchema(chat);

// Create a single supabase client for interacting with your database
export async function GET() {

      const data = await db.select().from(chat).where(eq(chat.userId, "06b9a326-7056-42e0-bb95-36e39eb82f1c"))
  

      createSelectSchema(chat)

      const responseType = typeof data

      return new Response(JSON.stringify(data));
}