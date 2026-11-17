import { ClientMessage, SerializedValue, ServerMessage, Sparse, Value } from "@poly-sheets/types";
import { Connection, sendMessage } from "./websockets.ts";
import { SheetService } from "sheet-svc";
import { ComputeService } from "compute-svc";

function createServer(svc: SheetService, computeSvc: ComputeService) {

  const subscribedRows: WeakMap<Connection, number> = new WeakMap();

  return function handler(msg: ClientMessage, source: Connection, peers: Connection[]) {
    const sheetId = source.channel;

    switch (msg[0]) {
      case "PATCH_CELL_DATA": {
        const patch = fromSerializedValues(msg[1]);
        const success = svc.updateSheetValues(sheetId, patch);

        if (success) {
          const values = "values" in success ? success.values : success;

          const changedVal = computeSvc.updateValues(sheetId, values);
          Object.assign(values, changedVal);

          const formulas = "formulas" in success ? success.formulas : undefined;
          if (formulas) {
            const changedForm = computeSvc.updateFormulas(sheetId, formulas);
            Object.assign(values, changedForm);

            const formulaMessage: ServerMessage = ["UPDATE_FORMULAS", formulas];
            sendMessage<ServerMessage>(formulaMessage, source, ...peers);
          }

  

          const serial = toSerializedValues(values);
          const message: ServerMessage = ["UPDATE_VALUES", serial];

          sendMessage<ServerMessage>(message, source, ...peers);
        }

        // ======== Assignment 7 =========
        //
        // TODO: Replace the above implementation of this `case` as
        //       described here. Instead of calling computeService directly,
        //       make a PATCH request to the Compute Host (the host and port
        //       parameters provided to `createServer` above). Follow the usual
        //       process for making a fetch() call and processing the response
        //       in a .then().
        //
        // const url = /* your code */;
        // const method = "PATCH";
        // const headers = /* your code */;
        // const body = /* get this from msg[1] */;
        //
        // fetch(url, { method, headers, body})
        //   .then(  /* check status and return res.json() */ )
        //   .then((json: object) => {
        //
            //       The JSON of the response will either be a single object
            //       such as
            //
            //          { "R0C0": "hello there", ... }
            //
            //       or an object which has `values` and `formulas`, like this:
            //
            //          {
            //            "values": {"R0C0": "hello there", ...},
            //            "formulas": {"R1C1": "@R0C0", ...}
            //          }
            //
            //        TODO: Write an expression which determines which of the above
            //        it is, and initialize the variable `values`:
            //
            //  const values: Sparse<SerializedValue> = ...;
            //
            //        TODO: Update the client (and any other clients observing the
            //        same spreadsheet) by sending an `UPDATE_VALUES` message
            //        via the Websocket, as you did in Assignment 4.
            //
            //        TODO: if the response from the PATCH is of the second form
            //        above, also send an `UPDATE_FORMULAS` message in the same
            //        way you did for Assignment 6.
            //
            //        TODO: Don't forget to .catch() and console.log any error
            //        that occurs
        };
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
