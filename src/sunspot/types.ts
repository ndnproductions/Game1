/** Region id per cell, indexed [row][col]. Ids run 0..n-1. */
export type RegionMap = number[][]

export interface Cell {
  r: number
  c: number
}

/**
 * Deduction rules a person can actually carry out at the table, cheapest first.
 * The generator refuses any puzzle these five cannot finish, which is what
 * guarantees the player never has to guess.
 */
export type RuleName =
  | 'only-square'
  | 'line-locks-region'
  | 'region-locks-line'
  | 'crowding'
  | 'paired-beams'

export type Tier = 'gentle' | 'warm' | 'bright' | 'blazing'

export interface Puzzle {
  n: number
  regions: RegionMap
  /** Column holding the cat, per row. */
  solution: number[]
  tier: Tier
  /** The most advanced rule the solve needed — this is what sets the tier. */
  hardestRule: RuleName
  /** Sum of rule weights across the solve; separates puzzles inside one tier. */
  score: number
  steps: number
  seed: number
}
