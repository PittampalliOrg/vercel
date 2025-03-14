import { PostgrestClient } from '@supabase/postgrest-js'
import { Database } from '@/lib/db/database.types'

const REST_URL = 'http://rest:3000'
// Create a single supabase client for interacting with your database
const postgrest = new PostgrestClient<Database>(REST_URL)

export default postgrest