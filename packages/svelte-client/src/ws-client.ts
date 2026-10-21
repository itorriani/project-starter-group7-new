import type {
  AbsoluteReference,
  ClientMessage,
  RCKey,
  SerializedValue,
  ServerMessage,
  Sheet,
  Sparse,
} from "@poly-sheets/types";
import { IntrinsicValue, PendingValue, Value } from "@poly-sheets/types";
import { parseKey } from "@poly-sheets/types";
import { type Connection, createConnection, sendMessage } from "./websocket.ts";

type OnChangeHandler = (ref: AbsoluteReference, valueOrFormula: Value | string ) => void

export function wsHandleChange(
  event: Event,
  connection: Connection,
  onChange: OnChangeHandler
) {
  // TODO: use the same code as in `handleChange` for all of these:
  //
  // const input = ...
  // const value = ...
  // const key = ...
  // const ref = ...
  // const patch: Sparse<Value> = ...;


    const input = event.target as HTMLInputElement;
    const value = Value.fromUserInput(input.value);
    const key = input.name as RCKey;
    const ref: AbsoluteReference = parseKey(key);
    const patch: Sparse<SerializedValue> = { [key]: value.toJSON() };


  // TODO: set the modified cell's value to a PendingValue,
  //       using the `onChange` callback.

  onChange(ref, new PendingValue(value)) 

  // TODO: compose a `PATCH_CELL_DATA` message to send
  //       to the server:
  //
  // const message: ClientMessage = ...

  // TODO: send the message using sendMessage()

  const message: ClientMessage = ["PATCH_CELL_DATA", patch];
  sendMessage<ClientMessage>(connection, message);

}


export function wsSubscribeChanges(
  sheetId: string,
  nrows: number,
  ws: Connection | undefined,
  onConnect: (ws: Connection) => void,
  onChange: OnChangeHandler
) {

  const message: ClientMessage = ["SUBSCRIBE_ROWS", nrows];

  if (sheetId) {
    if (ws?.channel !== sheetId) {
      createConnection<ServerMessage>(
        sheetId,
        (msg: ServerMessage) => wsHandleMessage(msg, onChange)
      ).then((conn) => {
        sendMessage<ClientMessage>(conn, message);
        onConnect(conn);
      });
    } else {
        sendMessage<ClientMessage>(ws, message);
    }
  }
}



function wsHandleMessage(msg: ServerMessage, onChange: OnChangeHandler ) {
  switch (msg[0]) {
    case "UPDATE_VALUES": {
      const patch = msg[1];

      // Record types are easier to handle
      // as an array of entries. So we start by getting
      // the entries in the patch object
      const entries = Object.entries(patch) as [RCKey, SerializedValue][];

      entries.forEach(([key, value]) => {
        // TODO: Convert the key to a reference
        //
        // const ref: AbsoluteReference = ...

        // TODO: Use `onChange` to make the change to the sheet
        const ref: AbsoluteReference = parseKey(key);
        onChange(ref, Value.fromJSON(value))

      });

      break;
    }
    case "UPDATE_FORMULAS": {
      // ======== Assignment 6 ========
      //
      // TODO: For each key in patch, call onChange with
      //       a reference and the formula.

      break;
    }
    default:
      console.log("Invalid message type:", msg[0]);
  }
}
