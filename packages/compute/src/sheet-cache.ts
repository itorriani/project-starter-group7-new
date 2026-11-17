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
    // Make a POST request to create the sheet in the
    // remote storage service.
    const url = this.baseUrl;
    const method = "POST";
    const headers = {
      "Content-Type": "application/json",
    };
    // The incoming sheet (from a proxied POST) already has its cells
    // as SerializedValues; JSON.stringify also handles Value objects
    // (via their toJSON), so either way this produces the
    // SerializedValue[][] body that storage expects.
    const body = JSON.stringify(sheet);
    return fetch(url, { method, headers, body })
      .then((res) => {
        // check the status and (if successful) return the JSON body
        if (!res.ok) {
          throw new Error(`Storage POST /sheets failed: ${res.status}`);
        }
        return res.json();
      })
      .then((json: object) => {
        const resp = json as {
          id: string;
          name: string;
          columns: string[];
          nrows: number;
          cells: SerializedValue[][];
          formulas?: Sparse<string>;
        };
        const sheet: WithId<Sheet> = {
          id: resp.id,
          name: resp.name,
          columns: resp.columns,
          nrows: resp.nrows,
          cells: convertCellValues(resp.cells),
          formulas: resp.formulas,
        };
        // Store the resulting sheet in the cache.
        this.loadCache(resp.id, sheet);
        return sheet;
      });
  }
  async getSheetByIdRemote(id: string): Promise<Sheet> {
    // check whether the sheet is in the cache (synchronously).
    const cached = this.getSheetById(id);
    if (cached) return Promise.resolve(cached);
    // Set up the REST request to get the sheet from the
    // remote storage service.
    const url = `${this.baseUrl}/${id}`;
    return fetch(url)
      .then((res) => {
        // check status and (if successful) return the json body
        if (res.status === 404) throw "Not Found";
        if (!res.ok) {
          throw new Error(`Storage GET /sheets/${id} failed: ${res.status}`);
        }
        return res.json();
      })
      .then((json: unknown) => {
        const resp = json as {
          name: string;
          columns: string[];
          nrows: number;
          cells: SerializedValue[][];
          formulas?: Sparse<string>;
        };
        const sheet: Sheet = {
          name: resp.name,
          columns: resp.columns,
          nrows: resp.nrows,
          cells: convertCellValues(resp.cells),
          formulas: resp.formulas,
        };
        // Store the resulting sheet in the cache.
        this.loadCache(id, sheet);
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
    // Set up the REST request to make the updates on the
    // remote storage service.
    const url = `${this.baseUrl}/${id}/cells`;
    const method = "PATCH";
    const headers = {
      "Content-Type": "application/json",
    };
    const body = JSON.stringify(patch);
    return fetch(url, { method, headers, body })
      .then((res) => {
        //check status and return the json body
        if (res.status === 404) throw "Not Found";
        if (!res.ok) {
          throw new Error(`Storage PATCH /sheets/${id}/cells failed: ${res.status}`);
        }
        return res.json();
      })
      .then((json: object) => {
        const changes = json as Sparse<SerializedValue> |
          { values: Sparse<SerializedValue>, formulas: Sparse<string> };
        const serializedValues: Sparse<SerializedValue> =
          "values" in changes ? changes.values : changes;
        const formulas: Sparse<string> =
          "formulas" in changes ? changes.formulas : {};
        // Convert each SerializedValue in serializedValues to a Value.
        const values: Sparse<Value> = Object.fromEntries(
          Object.entries(serializedValues).map(
            ([key, sv]) => [key, Value.fromJSON(sv)]
          )
        );
        // Keep the cached sheet in sync with the values just written
        // to the remote storage service.
        this.updateSheetValues(id, values);
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
          // add each of the formulas to `sheet.formulas`.
          Object.assign(sheet.formulas, formulas);
        }
        // Remove formulas which have changed to values
        Object.keys(values).forEach((key) => {
          if (sheet.formulas && (key as RCKey) in sheet.formulas) {
            // remove the entry for `key` in `sheet.formulas`
            delete sheet.formulas[key as RCKey];
          }
        });
        // A Sparse<Value> with all cells that have formulas:
        const pendingValues: Sparse<Value> = Object.fromEntries( Object.keys(formulas)
          .map((key) => [key, new PendingValue()]) );
        // Update the cached sheet with the values for cells
        // that are now pending calculation.
        this.updateSheetValues(id, pendingValues);
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
