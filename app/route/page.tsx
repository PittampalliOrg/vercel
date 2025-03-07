import { createClient } from '@clickhouse/client'

const client = createClient({
  url: process.env.CLICKHOUSE_LOCAL_ENDPOINT,
  username: process.env.CLICKHOUSE_LOCAL_USERNAME,
  password: process.env.CLICKHOUSE_LOCAL_PASSWORD,
  request_timeout: 30000,
})


export default async function Page() {
    const data = await client.query({
        query: 'SELECT * FROM logs LIMIT 10',
        format: 'JSONEachRow',
      })
      console.log(data)
    const rows = await data.json();
    return (
        <div>
            <h1>Clickhouse Data</h1>
            <pre>{JSON.stringify(rows, null, 2)}</pre>
        </div>
    )
  }


  