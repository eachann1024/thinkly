export interface HostDoc<T> {
  _id: string;
  _rev?: string;
  data: T;
}

export interface HostPutResult {
  id: string;
  ok: boolean;
  rev?: string;
  error?: unknown;
}

export interface HostRemoveResult {
  id: string;
  ok: boolean;
  error?: unknown;
}

/** 全局热键注册结果；state 供设置页区分 占用/无效/其它错误。 */
export interface HostHotkeyRegisterResult {
  ok: boolean;
  error?: string;
  state?: "occupied" | "invalid" | "error";
}

export interface HostRuntime {
  ensureGooseFs: () => Promise<void>;
  db: {
    put: <T>(id: string, data: T, rev?: string) => HostPutResult;
    get: <T>(id: string) => HostDoc<T> | null;
    remove: (id: string) => HostRemoveResult;
    allDocs: <T>(prefix?: string) => Array<HostDoc<T>>;
    // 附件存储走磁盘，统一使用异步接口。
    postAttachment: (
      id: string,
      data: Uint8Array,
      type: string,
    ) => Promise<HostPutResult>;
    getAttachment: (id: string) => Promise<Uint8Array | null>;
    getAttachmentType: (id: string) => Promise<string | null>;
  };
}
