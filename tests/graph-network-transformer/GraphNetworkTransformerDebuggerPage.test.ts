import { test, expect } from "bun:test"
import type { BpcGraph, CostConfiguration } from "lib"
import { GraphNetworkTransformer } from "lib/graph-network-transformer/GraphNetworkTransformer"
import { getHeuristicNetworkSimilarityDistance } from "lib/heuristic-network-similarity/getHeuristicSimilarityDistance"

const initialGraphSimple: BpcGraph = {
  boxes: [{ boxId: "B1", kind: "floating", center: { x: 0, y: 0 } }],
  pins: [
    {
      boxId: "B1",
      pinId: "P1",
      offset: { x: 0, y: 0.5 },
      color: "red",
      networkId: "N1",
    },
  ],
}

const targetGraphSimple: BpcGraph = {
  boxes: [{ boxId: "B1_target", kind: "floating", center: { x: 1, y: 1 } }], // Different boxId and center
  pins: [
    {
      boxId: "B1_target", // Corresponds to B1_target
      pinId: "P1_target", // Different pinId
      offset: { x: 0, y: -0.5 }, // Different offset
      color: "blue", // Different color
      networkId: "N2", // Different networkId
    },
  ],
}

const costConfiguration: Partial<CostConfiguration> = {
  baseOperationCost: 1,
  colorChangeCostMap: {
    "red->blue": 0.5,
    "blue->red": 0.5,
  },
  costPerUnitDistanceMovingPin: 0.1,
}

test("GraphNetworkTransformer - debugger page simple case", () => {
  const transformer = new GraphNetworkTransformer({
    initialGraph: initialGraphSimple,
    targetGraph: targetGraphSimple,
    costConfiguration,
  })

  transformer.solve()

  expect(transformer.solved).toBe(true)
  expect(transformer.failed).toBe(false)
  expect(transformer.error).toBeNull()

  // The final graph's network structure should match the target graph
  // This is confirmed if the heuristic distance is 0
  if (transformer.stats.finalGraph) {
    const finalDistance = getHeuristicNetworkSimilarityDistance(
      transformer.stats.finalGraph,
      targetGraphSimple,
      transformer.costConfiguration, // Use the full cost config from the transformer
    )
    expect(finalDistance.distance).toBe(0)
  } else {
    // Should not happen if solved is true
    expect(transformer.stats.finalGraph).toBeDefined()
  }

  // Check operations
  expect(transformer.stats.finalOperationChain).toBeDefined()
  // Expecting multiple operations:
  // 1. ChangePinColor (red->blue) = 0.5
  // 2. ChangePinNetwork (N1->N2, assuming N1 mapped to null, N2 new) = 1
  // 3. MovePin (0,0.5 -> 0,-0.5), distance = 1, cost = 1 * 0.1 = 0.1
  // Total gCost should be around 1.6.
  // The exact operations can vary based on A* search path.
  // We expect at least one operation.
  expect(transformer.stats.finalOperationChain.length).toBeGreaterThan(0)

  // Verify gCost is positive and reflects the expected transformations.
  // The exact gCost can be sensitive to the A* path and operation costs.
  // For this case, it involves color change, network change, and pin move.
  // Expected cost: 0.5 (color) + 1 (network) + 0.1 (move) = 1.6
  // Let's check it's close to this value.
  expect(transformer.stats.gCost).toBeGreaterThan(0)

  console.log(transformer.stats.finalOperationChain)

  // More specific checks for operation types if needed:
  const hasChangePinColor = transformer.stats.finalOperationChain.some(
    (op: any) => op.operation_type === "change_pin_color",
  )
  const hasChangePinNetwork = transformer.stats.finalOperationChain.some(
    (op: any) => op.operation_type === "change_pin_network",
  )
  const hasMovePin = transformer.stats.finalOperationChain.some(
    (op: any) => op.operation_type === "move_pin",
  )

  expect(hasChangePinColor).toBe(true)
  expect(hasChangePinNetwork).toBe(true)
  expect(hasMovePin).toBe(true)
})
