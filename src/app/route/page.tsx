import { clickhouseClient } from "@/lib/clickhouse"

let query = `
SELECT *
FROM otel_logs
WHERE Timestamp >= now() - INTERVAL 15 MINUTE
`

export default async function Page() {
    const data = await clickhouseClient.query({
        query: query,
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


  