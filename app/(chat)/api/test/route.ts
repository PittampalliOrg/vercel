import { createNewDabClient } from "@/lib/createDabClient";
import { DaprClient } from "@dapr/dapr"

const client = new DaprClient();
const dabClient = createNewDabClient();

export async function GET(request: Request) {
  
          // 1. Prepare the GraphQL mutation and variables
          const mutation = `
query getMessages {
  messages {
    items {
      chatId
      createdAt
      id
      role
    }
  }
}
          `;

          // 2. Execute the POST request to your GraphQL endpoint
          const response = await fetch(`http://frontend_dapr:3500/v1.0/invoke/dab/method/graphql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // If your Data API Builder requires auth, include it here (e.g. Authorization header)
            },
            body: JSON.stringify({
              query: mutation,
              variables: {},
            }),
          });
      
          const result = await response.json();
      
    // fetch("http://localhost:3500/v1.0/invoke/api/method/state", {
    //     method: "GET"})
    // console.log("GET request to state store")

    // const client = new DaprClient();
    // const state = [
    //     {
    //         key: "key1",
    //         value: "value1"
    //     }
    // ]
//    await client.state.save("postgresql", state);

//    const data = await client.state.get("postgresql", "ede74293-1c0a-4b1d-ae34-8996a1b82182");
//    const secret = await client.secret.get("localsecretstore", "ENV")
const data = await dabClient.message.get();
    await console.log(data);


  return new Response(JSON.stringify(data), { status: 200 });
}

