import postgrest from '@/lib/db/postgrest'

const REST_URL = 'http://rest:3000'
// Create a single supabase client for interacting with your database
export async function GET() {

      const { data, error } = await postgrest
        .from('user')
        .select('*')

        console.log(data)

      return new Response(JSON.stringify(data));
}