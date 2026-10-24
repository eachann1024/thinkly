import { hostRuntime } from "./index";

export class HostAdapter {
  static async ensureGooseFs(): Promise<void> {
    await hostRuntime.ensureGooseFs();
  }

  static db = {
    put: <T>(
      id: string,
      data: T,
      rev?: string,
    ): { id: string; ok: boolean; rev?: string; error?: any } => {
      return hostRuntime.db.put(id, data, rev);
    },

    get: <T>(id: string): { _id: string; _rev?: string; data: T } | null => {
      return hostRuntime.db.get(id);
    },

    remove: (id: string): { id: string; ok: boolean; error?: any } => {
      return hostRuntime.db.remove(id);
    },

    allDocs: <T>(
      prefix: string = "",
    ): Array<{ _id: string; _rev?: string; data: T }> => {
      return hostRuntime.db.allDocs(prefix);
    },

    postAttachment: async (
      id: string,
      data: Uint8Array,
      type: string,
    ): Promise<{ id: string; ok: boolean; error?: any }> => {
      return await hostRuntime.db.postAttachment(id, data, type);
    },

    getAttachment: async (id: string): Promise<Uint8Array | null> => {
      return await hostRuntime.db.getAttachment(id);
    },

    getAttachmentType: async (id: string): Promise<string | null> => {
      return await hostRuntime.db.getAttachmentType(id);
    },
  };
}
