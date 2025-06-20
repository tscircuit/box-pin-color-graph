import type { BpcGraph } from "lib/types"
import type { CostConfiguration } from "../configureOperationCostFn"
import type { AddBoxOp } from "../operation-types"

export const getAddBoxCost = (params: {
  op: AddBoxOp
  g: BpcGraph
  costConfiguration: CostConfiguration
}) => {
  return params.costConfiguration.baseOperationCost
}
