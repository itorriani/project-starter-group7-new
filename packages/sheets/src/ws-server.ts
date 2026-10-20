import { ClientMessage, SerializedValue, ServerMessage, Sparse, Value } from "@poly-sheets/types";
import { Connection, sendMessage } from "./websockets.ts";
import { SheetService } from "sheet-svc";
// TODO: [Assignment 6] Add this import:
//
// import { ComputeService } from "compute-svc";

function createServer(
  svc: SheetService

  // ======== Assignment 6 ========
  // TODO: add a second parameter of type ComputeService

) {

  const subscribedRows: WeakMap<Connection, number> = new WeakMap();

  return function handler(msg: ClientMessage, source: Connection, peers: Connection[]) {
    const sheetId = source.channel;

    switch (msg[0]) {
      case "PATCH_CELL_DATA": {
        const patch = fromSerializedValues(msg[1]);
        const success = svc.updateSheetValues(sheetId, patch);

        if (success) {
          // ======== Assignment 6 ========

          // TODO: Apply the same changes you made to the PATCH
          //       endpoint in api.ts here. That is:
          //
          //    1. Check whether `success` is an object with `values`
          //       and `formulas`.
          //    2. Call the ComputeService's `updateValues`
          //       with the values
          //    3. Call the ComupteService's `updateFormulas`
          //       with the formulas
          //    4. Merge all the changed values into one Sparse<Value>

          // TODO: If the patch included any formulas compose
          //       an `UPDATE_FORMULAS` message and send it.

  

          const patch = toSerializedValues(success);
          const message: ServerMessage = ["UPDATE_VALUES", patch];

          sendMessage<ServerMessage>(message, source, ...peers);
        }
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

function fromSerializedValues(serialized: Sparse<SerializedValue>): Sparse<Value> {
  const entries = Object.entries(serialized)
    .map(([key, json]) => [key, Value.fromJSON(json)]);
  return Object.fromEntries(entries);
}

function toSerializedValues(patch: Sparse<Value>): Sparse<SerializedValue> {
  const entries = Object.entries(patch)
    .map(([key, value]) => [key, value.toJSON()]);
  return Object.fromEntries(entries);
}

export default createServer;
