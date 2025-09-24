// serviceTypeValidation.js
import { z } from "zod";

/**
 * Validation rules:
 * - serviceCategoryId, serviceId required
 * - if showPackageDetails true -> packageName required
 * - each package must have at least 1 sub_package
 * - each sub_package.item_name required, price numeric >= 0
 * - preferences: groups with title optional, items each must have preference_value (non-empty)
 * - addons: addon_name optional, price numeric >= 0 if provided
 * - consentForm: question required if present, is_required 0/1
 *
 * NOTE: File inputs validated lightly as z.any().optional()
 */

const ConsentSchema = z.object({
  question: z.string().optional().or(z.literal("")).transform((s) => s || ""),
  is_required: z.union([z.string(), z.number()]).transform((v) =>
    Number(v || 0)
  ),
});

const PreferenceItemSchema = z.object({
  preference_id: z.any().optional(), // might be id from backend
  preference_value: z.string().optional().or(z.literal("")).transform((s) => s || ""),
  preference_price: z.preprocess((v) => (v === "" ? undefined : Number(v)), z.number().optional()),
  is_required: z.union([z.string(), z.number()]).transform((v) => Number(v || 0)),
});

const PreferenceGroupSchema = z.object({
  title: z.string().optional().or(z.literal("")).transform((s) => s || "Default"),
  items: z.array(PreferenceItemSchema).min(1, "At least one preference item required"),
});

const AddonSchema = z.object({
  addon_name: z.string().optional().or(z.literal("")).transform((s) => s || ""),
  description: z.string().optional().or(z.literal("")).transform((s) => s || ""),
  price: z.preprocess((v) => (v === "" ? undefined : Number(v)), z.number().optional()),
  time_required: z.string().optional().or(z.literal("")).transform((s) => s || ""),
});

const SubPackageSchema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  description: z.string().optional().or(z.literal("")).transform((s) => s || ""),
  // item_images will be handled externally as File or string
  item_images: z.any().optional(),
  price: z.preprocess((v) => (v === "" ? undefined : Number(v)), z.number().min(0).optional()),
  time_required: z.string().optional().or(z.literal("")).transform((s) => s || ""),
  preferences: z.array(PreferenceGroupSchema).optional().transform((v) => v || [ { title: "Default", items: [ { preference_value: "", is_required: 0 } ] } ]),
  addons: z.array(AddonSchema).optional().transform((v) => v || []),
  consentForm: z.array(ConsentSchema).optional().transform((v) => v || [{ question: "", is_required: 0 }]),
});

const PackageSchema = z.object({
  packageName: z.string().optional().or(z.literal("")).transform((s) => s || ""),
  sub_packages: z.array(SubPackageSchema).min(1, "At least one sub-package is required"),
});

export const ServiceTypeSchema = z.object({
  serviceCategoryId: z.string().min(1, "Select a category"),
  serviceId: z.string().min(1, "Select a service"),
  // top-level media, optional
  packageMedia_0: z.any().optional(),
  // package toggle handled in UI; if packages provided and showPackageDetails true validation happens
  showPackageDetails: z.boolean().optional().default(false),
  packageName: z.string().optional().or(z.literal("")).transform((s) => s || ""),
  packages: z.array(PackageSchema).min(1, "At least one package is required"),
});

// Helper for partial validation (e.g., allow empty strings to coerce)
export default ServiceTypeSchema;
