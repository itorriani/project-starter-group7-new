import {
  AbsoluteReference, IntrinsicValue, MoreRows, PendingValue,
  RCKey, Sparse, Value,
  parseKey, sparseKeyOf
} from "@poly-sheets/types";
import {
  Cache, DAG, LookupFunction,
  addToDAG, calculate
} from "@poly-sheets/formula";
import { ComputeService } from "./interface.ts";
import { SheetService } from "sheet-svc";

export class DAGComputeService implements ComputeService {

  sheetSvc: SheetService;
  sheetGraphs: Record<string, DAG> = {};
  cachedValues: Record<string, Sparse<Value>> = {};

  constructor(sheetSvc: SheetService) {
    this.sheetSvc = sheetSvc;
  }

  updateFormulas(sheetId: string, formulas: Sparse<string>): Sparse<Value> {
    const dag = this.getGraph(sheetId);
    addToDAG(dag, formulas);
    const formulaKeys = Object.keys(formulas) as RCKey[];
    return this.computeCells(sheetId, formulaKeys);
  }

  updateValues(
    sheetId: string,
    values: Sparse<Value>
  ): Sparse<Value> {
    const updatedKeys = Object.keys(values) as RCKey[];
    return this.computeCells(sheetId, updatedKeys, values);
  }

  computeCells(
    sheetId: string,
    startingKeys: RCKey[],
    forcedValues?: Sparse<Value>
  ): Sparse<Value> {
    const dag = this.getGraph(sheetId);
    const cache = this.getCache(sheetId)

    if( forcedValues ) {
      this.updateCache(sheetId, forcedValues);
      const nullFunctionEntries =
        Object.keys(forcedValues)
          .filter((key) => key in dag)
          .map((key) => [key, ""]);
      if (nullFunctionEntries.length) {
        addToDAG(dag, Object.fromEntries(nullFunctionEntries));
      }
    }

    const lookup = (ref: AbsoluteReference) => {
      const value = this.sheetSvc.getCellValue(sheetId, ref);
      if (typeof value === "undefined") return new IntrinsicValue();
      return value;
    }

    const computed = calculate(dag, startingKeys, lookup, cache);
    this.updateCache(sheetId, computed);

    return computed;
  }

  // Helper methods:

  getGraph(sheetId: string): DAG {
    let dag: DAG | undefined = this.sheetGraphs[sheetId];
    if (!dag) dag = this.sheetGraphs[sheetId] = {};
    return dag;
  }

  getCache(sheetId: string): Sparse<Value> {
    let cache = this.cachedValues[sheetId];
    if (!cache) cache = this.cachedValues[sheetId] = {};
    return cache;
  }

  updateCache(sheetId: string, values: Sparse<Value>): Sparse<Value> {
    const cache = this.getCache(sheetId);
    if (!cache) return {};
    Object.assign(cache, values);
    return values;
  }
}
