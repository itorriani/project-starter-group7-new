import { ClientMessage, SerializedValue, ServerMessage, Sparse, Value } from "@poly-sheets/types";
import { Connection, sendMessage } from "./websockets.ts";

function createServer(computeHost: string, computePort: number) {

  const subscribedRows: WeakMap<Connection, number> = new WeakMap();

  return function handler(msg: ClientMessage, source: Connection, peers: Connection[]) {
    const sheetId = source.channel;

    switch (msg[0]) {
      case "PATCH_CELL_DATA": {
        
        // TODO: Replace the above implementation of this `case` as
        //       described here. Instead of calling computeService directly,
        //       make a PATCH request to the Compute Host (the host and port
        //       parameters provided to `createServer` above). Follow the usual
        //       process for making a fetch() call and processing the response
        //       in a .then().
        
        const url = `http://${computeHost}:${computePort}/api/sheets/${sheetId}/cells`;
        const method = "PATCH";
        const headers = { "Content-Type": "application/json" };
        const body = JSON.stringify((msg[1]));
        
        fetch(url, { method, headers, body})
          .then((res)=> {
            if (!res.ok) {
              throw new Error(`Compute service returned error: ${res.status}`);
            }
            return res.json();
          })
          .then((json: object) => {
            const values: Sparse<SerializedValue> = "values" in json ? json.values as Sparse<SerializedValue> : json as Sparse<SerializedValue>;

            const valueMessage: ServerMessage = ["UPDATE_VALUES", values];
            sendMessage<ServerMessage>(valueMessage, source, ...peers);

            if ("formulas" in json) {
              const formulaMessage: ServerMessage = ["UPDATE_FORMULAS",json.formulas as Sparse<string>];
              sendMessage<ServerMessage>(formulaMessage, source, ...peers);
            }
          })
          .catch((err: Error) => {
            console.log(`WebSocket PATCH proxy error for sheet ${sheetId}:`, err);
          });
        break;
      }
      case "SUBSCRIBE_ROWS": {
        const nrows = msg[1];
        subscribedRows.set(source, nrows);
        break;
      }
      default:
        const invalidType: never = msg[0];
        console.log("Invalid message type:", invalidType);
    }
  }
}
export default createServer;
