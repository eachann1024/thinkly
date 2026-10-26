import { create } from "zustand";

/** Transient intent, consumed after the Git settings snapshot has loaded. */
export const useNotificationDestination = create<{
  repositoryId: string | null;
  requestId: number;
  consumedRequestId: number;
  selectRepository: (repositoryId: string | null) => void;
  consumeRepositoryRequest: (requestId: number) => void;
}>((set) => ({
  repositoryId: null,
  requestId: 0,
  consumedRequestId: 0,
  selectRepository: (repositoryId) => set((state) => ({ repositoryId, requestId: state.requestId + 1 })),
  consumeRepositoryRequest: (requestId) => set((state) =>
    state.requestId === requestId ? { repositoryId: null, consumedRequestId: requestId } : state,
  ),
}));
