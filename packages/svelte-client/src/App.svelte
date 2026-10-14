<script lang="ts">
  import { newSheet, sparseKeyOf, Value } from "@poly-sheets/types";
  import { wsHandleChange, wsSubscribeChanges } from "./ws-client.ts";
  import { type Connection } from "./websocket.ts";
  import Cell from "./Cell.svelte";

  let sheet = $state(newSheet(10, 50));
  let error = $state("");
  const ROW_CHUNK_SIZE = 50;

  // TODO: [Assignment 3] Declare variables `rowsLoaded`
  //       and `totalRows`. Compute them from the `sheet`
  //       data. Because we need these values to change
  //       whenever the sheet data changes, you must
  //       wrap the expressions with the `$derived()` rune:
  //
  let rowsLoaded = $derived(sheet.cells.length);
  let totalRows = $derived(sheet.nrows);

  // path: /app/:id  --> ["", "app", "#######-####-..."]
  const path = location.pathname.split("/");

  let sheetId = $state(path[2]);

  $effect(() => {

    //const url = `/api/sheets/${sheetId}`;

    //incorporate limit
    const url = `/api/sheets/${sheetId}?limit=${ROW_CHUNK_SIZE}`;

    fetch(url)
      .then((res: Response) => {
        if (!res.ok){
          throw new Error(`Sheet with id ${sheetId} cannot be found (HTTP ${res.status})`)
        }
        return res.json();
      })
      .then((json: unknown) => {
        const { cells, nrows, columns, name } = json as { cells: SerializedValue[][], nrows: number, columns: string[], name: string };

        const cellValues = convertCellValues(cells);

          sheet = { ...sheet, name, columns, nrows, cells: cellValues };

      })
      .catch((err: Error) => {
        error = err.message;
      });

    // ======== Assignment 3 ========
    //
    // TODO: Modify the above `fetch` call by adding the `limit`
    //       query parameter to the `url`. Use the value of
    //       `ROW_CHUNK_SIZE` as the limit.
  })

  let wsConnection: Connection | undefined;

  // ======== Assignment 4 ========

  // TODO: write an $effect() which calls wsSubscribeChanges.
  //       Use the relevant state variables above as arguments,
  //       so the effect is re-executed if any of them change.
  //       You will need two callback functions: the first,
  //       should set `wsConnection` above; the second should
  //       modify the referenced cell in `sheet.cells`

  // ======== Assignment 6 =========
  //
  // TODO: define a $state variable to toggle the formulas
  //       on and off. The initial value should be false
  //
  // let showFormulas = ...

</script>

<main>
  <header>
    <h1>Poly-Sheets</h1>
    <!--
      TODO: [ Assignment 6 ] Add a labeled checkbox bound to the value of
            `showFormulas`. Write an event handler so that
            when a user changes the value, the `showFormulas`
            variable is updated to the current state of the
            checkbox.
    -->
  </header>
  <section class="sheet">
    <table class="sticky">
      <thead>
        <tr>
          <th></th>
          {#each sheet.columns as val, num}
            <th>{num}</th>
          {/each}
        </tr>
        <tr>
          <th></th>
          {#each sheet.columns as col}
            <th> {col.toString()}</th>
          {/each}
        </tr>
      </thead>
      <tbody onchange={ (event: Event) => {
        // TODO: [Assignment 3] handle change events by calling `handleChange`
        //       (see the <script> at end of this file)

        // TODO: [Assignment 4] if wsConnection is set, call `wshandleChange`
        //       instead of handleChange

        // TODO: [Assignment 6] add a `class` attribute to the <tbody>
        //       to control displaying formulas. Set class="hide-formulas"
        //       if `showFormulas` is false, and class="show-formulas"
        //       if `showFormulas` is true.
      }}>
        {#each sheet.cells as row, i}
        <tr>
          <th>{i}</th>
          {#each row as col}
            <td>{col.toString()}</td>
          {/each}
        </tr>
        {/each}
        <!--

          TODO: [Assignment 6] add a formula= property to the
                Cell component instance, like this:

                  formula={ sheet.formulas
                    ? sheet.formulas[sparseKeyOf({row: r, column: c})]
                    : "" }
        -->
      </tbody>
    </table>
    {#if error}
      <p class="toast"> {error} </p>
    {/if}
  </section>
  <footer>
    <span>{ sheet.name } </span>
    <span>
      {#if rowsLoaded < totalRows}
        {rowsLoaded}/{totalRows} rows loaded
        <!-- button for more rows -->
        <button onclick={() => loadMoreRows(sheetId, sheet, ROW_CHUNK_SIZE)}>Load More Rows</button>
      {:else}
        {totalRows} rows
      {/if}
    </span>
  </footer>
</main>

<script module lang="ts">
  import type {
    AbsoluteReference,
    MoreRows,
    RCKey,
    Sheet,
    Sparse
  } from "@poly-sheets/types";
  import { parseKey, PendingValue } from "@poly-sheets/types";

  // Converts rows of values that were sent as JSON
  // into instances of class Value, which is how we store
  // values in memory
  function convertCellValues(cells: SerializedValue[][]): Value[][] {
    return cells.map(
      (row) => row.map(
        (v) => Value.fromJSON(v)
      ));
  }

  function loadMoreRows(
    sheetId: string,
    sheet: Sheet,
    maxRows: number
  ): Promise<MoreRows> {

    //seperate parts of the url that are relevant
    const path = `sheets/${sheetId}/cells`;
    const start = `start=${sheet.cells.length}`;
    const limit = `limit=${maxRows}`;

    return fetch(`/api/${path}?${start}&${limit}`)
      .then((res: Response) => {
        if (!res.ok) {
          throw new Error(`Failed to load rows`);
        }
        return res.json();
      })
      .then((json: unknown) => {
        const moreRows = json as { count: number, rows: SerializedValue[][] };
        const newRows = convertCellValues(moreRows.rows);
        for (const row of newRows) {
          sheet.cells.push(row);
        }
      });
  }

  function handleChange(
    event: Event,
    sheetId: string,
    sheet: Sheet
  ): Promise<SheetPatch> {
    // ======== Assignment 3 ========

    // TODO: Find the `<input>` element which changed to trigger
    //       this event. Hint: you will find it in the Event object,
    //       though you will need to use `as HTMLInputElement` to
    //       convince TypeScript it's actually an <input>
    //
    // const input = /* get from event */ as HTMLInputElement;

    // TODO: Compose the correct URL for our PATCH request
    //
    // const url = `/api/...`;

    // TODO: Define `value`, the string or number entered by the user.
    //       This is trickier than it sounds. `input.value` will
    //       contain the value as a string. But if the user enters
    //       a number, we want to convert it to a number. Hint:
    //       the static method Value.fromUserInput can handle
    //       this conversion for you
    //
    //  const value = ...

    // TODO: Define `key`, which identifies this cell in
    //       sparse patch format. This is made easier by way
    //       we named our `<input>` elements. Basically, the
    //       key is the input's name.
    //
    // const key = /* get name from input */ as RCKey;

    // TODO: compute `ref` from the `key`. An AbsoluteReference
    //       gives us the row and column of the cell.
    //       We will need this when we update the local state.
    //       Hint: look at the `parseKey()` function imported above
    //
    // const ref: AbsoluteReference = ...

    // TODO: Save the old value of the cell referenced by `ref`.
    //       We will need this in case the patch fails on the
    //       server.
    //
    // const oldValue: Value = ...

    // TODO: Build the `Sparse<Value>` object, which we
    //       will send as the body of our request. It will have
    //       just one entry, mapping `key`: `value`.
    //
    // const patch: Sparse<Value> = ...;

    // TODO: Let the user know that their change is pending
    //       communication with the server. Do this by creating
    //       a `PendingValue` from `value` and assigning the cell
    //       referenced by `ref` in `sheet.cells`
    //
    // ...

    return fetch(url, {
      // TODO: build the options for the request. Fill in the
      //       following:
      //
      // method: ...,
      // headers: {
      //    ...
      // },
      // body: ...
    }).then((res) => {
      // TODO: check status, return JSON if ok, else throw
    }).then((json: unknown) => {
      // TODO: update the value of the one cell in sheet.cells
      //
      // ...
    }).catch((err) => {
      // TODO: if the request failed, we want to remove
      //       the value which the user entered, and restore
      //       `input.value` from `oldValue`
      //
      // ...
      throw err;
    })
  }
</script>
