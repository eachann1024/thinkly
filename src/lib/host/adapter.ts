import { hostRuntime } from "./index";

export class HostAdapter {
  static async ensureGooseFs(): Promise<void> {
    await hostRuntime.ensureGooseFs();
  }

  /**
   * Database Operations
   */
  static db = {
    /**
     * Save a document
     * @param id Document ID
     * @param data Data to save
     */
    put: <T>(
      id: string,
      data: T,
      rev?: string,
    ): { id: string; ok: boolean; rev?: string; error?: any } => {
      return hostRuntime.db.put(id, data, rev);
    },

    /**
     * Get a document
     * @param id Document ID
     */
    get: <T>(id: string): { _id: string; _rev?: string; data: T } | null => {
      return hostRuntime.db.get(id);
    },

    /**
     * Delete a document
     * @param id Document ID
     */
    remove: (id: string): { id: string; ok: boolean; error?: any } => {
      return hostRuntime.db.remove(id);
    },

    /**
     * Get all documents with a prefix
     * @param prefix ID prefix
     */
    allDocs: <T>(
      prefix: string = "",
    ): Array<{ _id: string; _rev?: string; data: T }> => {
      return hostRuntime.db.allDocs(prefix);
    },

    /**
     * 存储附件（Electron 桌面端上限 50MB）
     * @param id 附件 ID
     * @param data 二进制数据
     * @param type MIME 类型
     */
    postAttachment: async (
      id: string,
      data: Uint8Array,
      type: string,
    ): Promise<{ id: string; ok: boolean; error?: any }> => {
      return await hostRuntime.db.postAttachment(id, data, type);
    },

    /**
     * 读取附件
     * @param id 附件 ID
     */
    getAttachment: async (id: string): Promise<Uint8Array | null> => {
      return await hostRuntime.db.getAttachment(id);
    },

    /**
     * 获取附件 MIME 类型
     * @param id 附件 ID
     */
    getAttachmentType: async (id: string): Promise<string | null> => {
      return await hostRuntime.db.getAttachmentType(id);
    },
  };
}
