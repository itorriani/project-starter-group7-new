import {
  PendingValue, RCKey,
  SerializedValue, Sheet, Sparse, Value, WithId
} from "@poly-sheets/types";
import { InMemorySheetService } from "sheet-svc";

// SheetCache is used to maintain cached sheets
// in the memory of the compute service. The
// persistent storage of the sheets is provided by
// a remote storage service, only accessible via
// asynchronous REST requests. Once a sheet is
// in the cache, it can be operated on using the
// `interface SheetService` methods, which are
// inherited through `InMemorySheetService`.

export class SheetCache extends InMemorySheetService {

  // The URL of the sheets collection on the remote
  // storage service.
  baseUrl: string;

  constructor(host: string, port: number) {
    super();
    this.baseUrl = `http://${host}:${port}/api/sheets`;
  }

  // Loads the cache with a new sheet. Used to store
  // the responses from the remote storage service
  loadCache(id: string, sheet: Sheet) {
    this.storedSheets[id] = sheet;
  }

  // ======== Assignment 7 ========
  //
  // Add asynchronous versions of addSheetById, and
  // updateSheetValues, which make REST requests to
  // the storage service and cache the results. It is
  // very important to make sure the SheetCache data
  // (what is accessed through `this`) remains in
  // sync with what's in the database (accessed through
  // REST).

  async addSheetRemote(sheet: Sheet): Promise<WithId<Sheet>> {

    // TODO: Define the following variables, used in the `fetch`
    //       call below. The fetch should make the appropriate
    //       REST request to create a sheet in the remote storage
    //       service.

    const url = "";  // <- replace with the correct url
    const method = ""; // <- replace with the correct method
    const headers = {
      // add the correct headers
    };
    const body = ""; // <- replace with the correct body

    return fetch(url, { method, headers, body })
      .then((res) => {
        // TODO: check the status and (if successful)
        //       return the JSON body
      })
      .then((json: object) => {

        const { cells, id } = json as {
          cells: SerializedValue[][];
          id: string;
        };

        const sheet: WithId<Sheet> = {
          // TODO: convert the JSON response body into a
          //       proper sheet. You need to convert all
          //       SerializedValues in `json.cells` to Values
          //       (required by `interface Sheet`). See
          //       the helper function below.
        };

        // TODO: Store the resulting sheet in the
        //   cache, using `this.loadCache` (see above).
        //
        // this.loadCache(...)

        // return the sheet to resolve the Promise
        return sheet;
      })
  }

  async getSheetByIdRemote(id: string): Promise<Sheet> {

    // TODO: check whether the sheet is in the cache.
    //       You can do this synchronously. If it is
    //       cached, return an already-resolved Promise.
    //
    // const cached = ...; // get the sheet
    // if (cached) return Promise.resolve(cached);

    // TODO: Set up the REST request to get the sheet from
    //       the remote storage service.

    const url = "";  // replace with correct URL

    return fetch(url)
      .then((res) => {
        // TODO: check status and (if successful)
        //   return the json body
      })
      .then((json: unknown) => {
        const { cells } = json as { cells: SerializedValue[][] };

        const sheet = {
           // TODO: convert the JSON response body into a
           //       proper sheet. You need to convert all
           //       SerializedValues in `json.cells` to Values
           //       (required by `interface Sheet`). See
           //       the helper function below.
        };

        // TODO: Store the resulting sheet in the
        //   cache, using `this.loadCache` (see above).
        //
        // this.loadCache(...)

        // return the sheet to resolve the Promise
        return sheet;
      });
  }

  async updateSheetValuesRemote(
    id: string,
    patch: Sparse<SerializedValue>
  ): Promise<
    Sparse<Value>
    | { values: Sparse<Value>, formulas: Sparse<string>}
  > {
    // We can't cache partial sheets, so start by ensuring
    // the whole sheet is in the cache. Since that may
    // require making a REST request, we need to
    // `await` the result.
    const sheet = await this.getSheetByIdRemote(id);

    // TODO: Set up the REST request to make the updates
    //   on the remote storage service.

    const url = ""; // <- replace with the correct URL
    const method = ""; // <- replace with the correct method
    const headers = {
      // add the correct headers
    };
    const body = ""; // <- replace with the correct body

    return fetch(url, { method, headers, body })
      .then((res) => {
        //check status and return the json body
      })
      .then((json: object) => {
        const changes = json as Sparse<SerializedValue> |
        { values: Sparse<SerializedValue>, formulas: Sparse<string> };
        let serializedValues: Sparse<SerializedValue> =
          "values" in changes ? changes.values : changes;
        const formulas: Sparse<string> =
          "formulas" in changes ? changes.formulas : {};

        // TODO: Convert each SerializedValue in serializedValues
        //   to a Value, which is a Sparse<Value>

        const values: Sparse<Value> = {}; // <- replace with your code

        // TODO: Keep the cached sheet in sync with changes made
        //       on the remote. Use the `SheetService` interface on
        //       `this` to update the cache with `values`
        //
        // this. ... ; // call a method on SheetService

        // Now we will address the formulas in the cache. This is
        // trickier because of the interactions between formulas
        // and values ... the remote storage service does not
        // persist values computed by the compute service from
        // formulas. There are three cases to consider:
        //
        // 1. a cell's formula was updated
        // 2. a cell which had a value now has a formula
        // 3. a cell which had a formula now has a value
        //
        // `SheetService` does not provide an interface for
        // updating `formulas`. (Maybe it should.)  But we
        // can directly mutate the `sheet.formulas` object.

        // Add any new formulas to cache
        if (Object.keys(formulas).length > 0) {
          if (!sheet.formulas) sheet.formulas = {} as Sparse<string>;
          // TODO: add each of the formulas to `sheet.formulas`. You
          //       may do this by looping through all entries
          //       in `formulas`. Or, for a quick way, look up the
          //       JS function `Object.assign()`
        }

        // Remove formulas which have changed to values
        Object.keys(values).forEach((key) => {
          if (sheet.formulas && key as RCKey in sheet.formulas) {
            // TODO: remove the entry for `key` in `sheet.formulas`
          });

        // A Sparse<Value> with all cells that have formulas:
        const pendingValues: Sparse<Value> = Object.fromEntries( Object.keys(formulas)
          .map((key) => [key, new PendingValue()]) );

        // A Sparse<Value> with all cells that have f

        // TODO: Update the cached sheet with the values for cells
        //       that are now pending calculation.
        //
        // this. ... ; // call a method on SheetService

        // Resolve the promise with the new values and formulas
        if ("formulas" in changes) {
          return { values, formulas };
        } else {
          return values;
        }
      });
  }
}


// helper functions

function convertCellValues(cells: SerializedValue[][]): Value[][] {
  return cells.map(
    (row) => row.map(
      (v) => Value.fromJSON(v)
    ));
}
