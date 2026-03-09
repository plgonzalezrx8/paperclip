import type { AssetFile, AssetImage } from "@paperclipai/shared";
import { api } from "./client";

async function createStableBrowserFile(file: File) {
  // Keep uploads self-contained so pasted or transient file handles are still readable
  // once fetch serializes the multipart body.
  const buffer = await file.arrayBuffer();
  return new File([buffer], file.name, { type: file.type });
}

export const assetsApi = {
  uploadImage: async (companyId: string, file: File, namespace?: string) => {
    const safeFile = await createStableBrowserFile(file);
    const form = new FormData();
    form.append("file", safeFile);
    if (namespace && namespace.trim().length > 0) {
      form.append("namespace", namespace.trim());
    }
    return api.postForm<AssetImage>(`/companies/${companyId}/assets/images`, form);
  },
  uploadFile: async (companyId: string, file: File, namespace?: string) => {
    const safeFile = await createStableBrowserFile(file);
    const form = new FormData();
    form.append("file", safeFile);
    if (namespace && namespace.trim().length > 0) {
      form.append("namespace", namespace.trim());
    }
    return api.postForm<AssetFile>(`/companies/${companyId}/assets/files`, form);
  },
};
