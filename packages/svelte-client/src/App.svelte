<script lang="ts">
  import { newSheet, sparseKeyOf, Value } from "@poly-sheets/types";
  import { wsHandleChange, wsSubscribeChanges } from "./ws-client.ts";
  import { type Connection } from "./websocket.ts";
  import Cell from "./Cell.svelte";

  let sheet = $state(newSheet(10, 50));
  let error = $state("");
  const ROW_CHUNK_SIZE = 50;


  let rowsLoaded = $derived(sheet.cells.length);
  let totalRows = $derived(sheet.nrows);

  
  const path = location.pathname.split("/");

  let sheetId = $state(path[2]);

  $effect(() => {

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
  })

  let wsConnection: Connection | undefined;

  // ======== Assignment 4 ========

  // TODO: write an $effect() which calls wsSubscribeChanges.
  //       Use the relevant state variables above as arguments,
  //       so the effect is re-executed if any of them change.
  //       You will need two callback functions:
  //        (1) the first should set `wsConnection` above
  //        (2) the second--let's call it 'onChange' to match what
  //              itsin ws-client.ts,
  //              should modify the referenced cell in `sheet.cells`.
  //              This callback function will take two arguments:
  //              an AbsoluteReference is the first, the second is
  //              either a Value _or_ a string. For this part of
  //              the project, you only need to deal with the case
  //              when the 2nd argument is a Value--the case when it's
  //              a string (representing a "formula") will be covered
  //              in a later increment.

  // ======== Assignment 6 =========
  //
  // TODO: You need to modify the 'onChange' callback function you defined
  //       just above this line, back during Assignment 4. Right now, this
  //       callback function takes an AbsoluteRef and a second argument that
  //       can be either a Value or a string. You've already handled the
  //       Value case, which represents when the user is trying to change
  //       the value stored in a certain cell of the spreadsheet. Now add
  //       the code to handle the case where the second argument is a string,
  //       representing a situation where the user is trying to edit the _formula_
  //       being stored at a specific cell. This will involve modifying not the
  //       the 'cells' array, but the 'formulas' sparse matrix (make sure your
  //       code handles the case where 'formulas' is still set to 'undefined'!)
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
        handleChange(event, sheetId, sheet)
        // TODO: [Assignment 4] if wsConnection is set, call `wshandleChange`
        //       instead of handleChange

        // TODO: [Assignment 6] add a `class` attribute to the <tbody>
        //       to control displaying formulas. Set class="hide-formulas"
        //       if `showFormulas` is false, and class="show-formulas"
        //       if `showFormulas` is true.
      }}>
        {#each sheet.cells as row, r}
        <tr>
          <th>{r}</th>
          {#each row as value, c}
            <Cell row={r} column={c} {value} />
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
  ): Promise<Sparse<Value>> {

    const input = event.target as HTMLInputElement;
    const url = `/api/sheets/${sheetId}/cells`;
    const value = Value.fromUserInput(input.value);
    const key = input.name as RCKey;
    const ref: AbsoluteReference = parseKey(key);
    const oldValue: Value = sheet.cells[ref.row][ref.column];

    
    const patch: Sparse<Value> = { [key]: value };
    sheet.cells[ref.row][ref.column] = new PendingValue(value); //let user know req is pending

    return fetch(url, {
  
      method: "PATCH",
      headers: {
          "Content-Type": "application/json"
       },
       body: JSON.stringify(patch)
    }).then((res) => {
      if (!res.ok){
        throw new Error(`PATCH failed with status ${res.status}`);
      }
      return res.json();
    }).then((json: unknown) => {
      sheet.cells[ref.row][ref.column] = value;
      return json as Sparse<Value>;
    }).catch((err) => {
      sheet.cells[ref.row][ref.column] = oldValue;
      input.value = String(oldValue);
      throw err;
    })
  }
</script>
