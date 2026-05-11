export const workerModuleSummary = {
  path: 'src/workers',
  title: 'Worker boundary',
  description:
    'Worker entrypoints, message contracts, and the simulation host now live here for the off-main-thread execution boundary.',
}

export {
  createPositionsMessage,
  positionsTransferList,
  type SimulationWorkerCommandType,
  type SimulationWorkerRequest,
  type SimulationWorkerResponse,
} from './protocol'
export { SimulationWorkerHost } from './simulationWorker'
