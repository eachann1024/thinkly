export type ModelAction = "save" | "switch" | "refresh";
type ModelRequest = { requestId: number; action: ModelAction };
export type ModelRequestState =
  | { status: "idle" }
  | ({ status: "saving" | "loading" } & ModelRequest)
  | ({ status: "loaded"; count: number } & ModelRequest)
  | ({
      status: "failed";
      message: string;
      configSaved: boolean;
    } & ModelRequest);
export type ConnectionTestState =
  | { status: "idle" }
  | { status: "testing"; requestId: number }
  | {
      status: "success" | "failed" | "timeout";
      requestId: number;
      message: string;
    };
export type AIRequestState = {
  models: ModelRequestState;
  test: ConnectionTestState;
};
export type AIRequestEvent =
  | ({ type: "models.started" } & ModelRequest)
  | { type: "models.configSaved"; requestId: number }
  | { type: "models.loaded"; requestId: number; count: number }
  | { type: "models.failed"; requestId: number; message: string }
  | { type: "models.cancelled" | "models.errorDismissed" }
  | { type: "test.started"; requestId: number }
  | {
      type: "test.resolved";
      requestId: number;
      result: "success" | "failed" | "timeout";
      message: string;
    }
  | { type: "test.cancelled" };
export const initialAIRequestState: AIRequestState = {
  models: { status: "idle" },
  test: { status: "idle" },
};
export const isModelRequestBusy = (state: ModelRequestState) =>
  state.status === "saving" || state.status === "loading";
export function aiRequestReducer(
  state: AIRequestState,
  event: AIRequestEvent,
): AIRequestState {
  switch (event.type) {
    case "models.started":
      if (isModelRequestBusy(state.models) || state.test.status === "testing")
        return state;
      return {
        ...state,
        models: {
          status: "saving",
          requestId: event.requestId,
          action: event.action,
        },
      };
    case "models.configSaved":
      if (
        state.models.status !== "saving" ||
        state.models.requestId !== event.requestId
      )
        return state;
      return { ...state, models: { ...state.models, status: "loading" } };
    case "models.loaded":
    case "models.failed": {
      const current = state.models;
      if (
        !isModelRequestBusy(current) ||
        !("requestId" in current) ||
        current.requestId !== event.requestId
      )
        return state;
      const request = { requestId: current.requestId, action: current.action };
      return {
        ...state,
        models:
          event.type === "models.loaded"
            ? { ...request, status: "loaded", count: event.count }
            : {
                ...request,
                status: "failed",
                message: event.message,
                configSaved: current.status === "loading",
              },
      };
    }
    case "models.cancelled":
      return { ...state, models: { status: "idle" } };
    case "models.errorDismissed":
      return state.models.status === "failed"
        ? { ...state, models: { status: "idle" } }
        : state;
    case "test.started":
      if (state.test.status === "testing" || isModelRequestBusy(state.models))
        return state;
      return {
        ...state,
        test: { status: "testing", requestId: event.requestId },
      };
    case "test.resolved":
      if (
        state.test.status !== "testing" ||
        state.test.requestId !== event.requestId
      )
        return state;
      return {
        ...state,
        test: {
          status: event.result,
          requestId: event.requestId,
          message: event.message,
        },
      };
    case "test.cancelled":
      return { ...state, test: { status: "idle" } };
  }
}
