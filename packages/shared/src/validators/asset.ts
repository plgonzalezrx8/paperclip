import { z } from "zod";

const assetMetadataSchema = z.object({
  namespace: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9/_-]+$/)
    .optional(),
});

export const createAssetImageMetadataSchema = assetMetadataSchema;
export type CreateAssetImageMetadata = z.infer<typeof createAssetImageMetadataSchema>;

export const createAssetFileMetadataSchema = assetMetadataSchema;
export type CreateAssetFileMetadata = z.infer<typeof createAssetFileMetadataSchema>;
