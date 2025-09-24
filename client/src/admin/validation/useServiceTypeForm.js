// useServiceTypeForm.js
import { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ServiceTypeSchema from "./serviceTypeValidation";

/**
 * useServiceTypeForm
 *
 * - Returns: register, control, errors, watch, handlers to add/remove at various nested levels,
 *   and serializeToFormData(values, filesMap) to convert values + files into FormData ready for upload.
 *
 * Usage:
 * const {
 *   register, control, handleSubmit, errors, watch,
 *   appendPackage, removePackage, appendSubPackage, removeSubPackage, ...
 *   setValue, getValues, serializeToFormData
 * } = useServiceTypeForm({ defaultValues: ..., mode: "onBlur" });
 *
 * Note: File inputs should be controlled via setValue(name, file) so RHF keeps file in its state.
 */

export function makeEmptyPreferenceItem() {
  return { preference_id: undefined, preference_value: "", preference_price: "", is_required: "0" };
}
export function makeEmptyPreferenceGroup(title = "Default") {
  return { title, items: [makeEmptyPreferenceItem()] };
}
export function makeEmptySubPackage() {
  return {
    item_name: "",
    description: "",
    item_images: null,
    price: "",
    time_required: "",
    preferences: [makeEmptyPreferenceGroup()],
    addons: [{ addon_name: "", description: "", price: "", time_required: "" }],
    consentForm: [{ question: "", is_required: "0" }],
  };
}
export function makeEmptyPackage() {
  return { packageName: "", sub_packages: [makeEmptySubPackage()] };
}

export default function useServiceTypeForm({ defaultValues = null, mode = "onBlur" } = {}) {
  const dv = defaultValues || {
    serviceCategoryId: "",
    serviceId: "",
    packageMedia_0: null,
    showPackageDetails: false,
    packageName: "",
    packages: [makeEmptyPackage()],
  };

  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isValid, isSubmitting, touchedFields },
    reset,
  } = useForm({
    defaultValues: dv,
    resolver: zodResolver(ServiceTypeSchema),
    mode,
  });

  // packages field array
  const packagesFA = useFieldArray({
    control,
    name: "packages",
  });

  // helpers to manipulate sub_packages for a package index
  const makeSubFieldArray = (pkgIndex) =>
    useFieldArray({
      control,
      name: `packages.${pkgIndex}.sub_packages`,
    });

  // Because hooks cannot be called conditionally in loops, expose functions that call setValue/append/remove directly
  function appendPackage(p = null) {
    packagesFA.append(p || makeEmptyPackage());
  }
  function removePackage(index) {
    packagesFA.remove(index);
  }

  // Sub-package operations (manipulate array value directly)
  function appendSubPackage(pkgIndex, sub = null) {
    const vals = getValues();
    const pkgs = vals.packages || [];
    const target = pkgs[pkgIndex];
    if (!target) return;
    target.sub_packages = [...(target.sub_packages || []), sub || makeEmptySubPackage()];
    setValue("packages", pkgs, { shouldTouch: true, shouldValidate: true });
  }
  function removeSubPackage(pkgIndex, subIndex) {
    const vals = getValues();
    const pkgs = vals.packages || [];
    const target = pkgs[pkgIndex];
    if (!target) return;
    const filtered = target.sub_packages.filter((_, i) => i !== subIndex);
    pkgs[pkgIndex] = { ...target, sub_packages: filtered.length ? filtered : [makeEmptySubPackage()] };
    setValue("packages", pkgs, { shouldTouch: true, shouldValidate: true });
  }

  // Preference group / item helpers
  function addPreferenceGroup(pkgIndex, subIndex) {
    const vals = getValues();
    const sub = vals?.packages?.[pkgIndex]?.sub_packages?.[subIndex];
    if (!sub) return;
    sub.preferences = [...(sub.preferences || []), makeEmptyPreferenceGroup("")];
    setValue("packages", vals.packages, { shouldTouch: true, shouldValidate: true });
  }
  function removePreferenceGroup(pkgIndex, subIndex, groupIndex) {
    const vals = getValues();
    const sub = vals?.packages?.[pkgIndex]?.sub_packages?.[subIndex];
    if (!sub) return;
    const filtered = (sub.preferences || []).filter((_, i) => i !== groupIndex);
    sub.preferences = filtered.length ? filtered : [makeEmptyPreferenceGroup("Default")];
    setValue("packages", vals.packages, { shouldTouch: true, shouldValidate: true });
  }
  function addPreferenceItem(pkgIndex, subIndex, groupIndex) {
    const vals = getValues();
    const group = vals?.packages?.[pkgIndex]?.sub_packages?.[subIndex]?.preferences?.[groupIndex];
    if (!group) return;
    group.items = [...(group.items || []), makeEmptyPreferenceItem()];
    setValue("packages", vals.packages, { shouldTouch: true, shouldValidate: true });
  }
  function removePreferenceItem(pkgIndex, subIndex, groupIndex, itemIndex) {
    const vals = getValues();
    const group = vals?.packages?.[pkgIndex]?.sub_packages?.[subIndex]?.preferences?.[groupIndex];
    if (!group) return;
    const filtered = (group.items || []).filter((_, i) => i !== itemIndex);
    group.items = filtered.length ? filtered : [makeEmptyPreferenceItem()];
    setValue("packages", vals.packages, { shouldTouch: true, shouldValidate: true });
  }

  // Addon helpers
  function addAddon(pkgIndex, subIndex) {
    const vals = getValues();
    const sub = vals?.packages?.[pkgIndex]?.sub_packages?.[subIndex];
    if (!sub) return;
    sub.addons = [...(sub.addons || []), { addon_name: "", description: "", price: "", time_required: "" }];
    setValue("packages", vals.packages, { shouldTouch: true, shouldValidate: true });
  }
  function removeAddon(pkgIndex, subIndex, addonIndex) {
    const vals = getValues();
    const sub = vals?.packages?.[pkgIndex]?.sub_packages?.[subIndex];
    if (!sub) return;
    const filtered = (sub.addons || []).filter((_, i) => i !== addonIndex);
    sub.addons = filtered.length ? filtered : [{ addon_name: "", description: "", price: "", time_required: "" }];
    setValue("packages", vals.packages, { shouldTouch: true, shouldValidate: true });
  }

  // Consent helpers
  function addConsent(pkgIndex, subIndex) {
    const vals = getValues();
    const sub = vals?.packages?.[pkgIndex]?.sub_packages?.[subIndex];
    if (!sub) return;
    sub.consentForm = [...(sub.consentForm || []), { question: "", is_required: "0" }];
    setValue("packages", vals.packages, { shouldTouch: true, shouldValidate: true });
  }
  function removeConsent(pkgIndex, subIndex, consentIndex) {
    const vals = getValues();
    const sub = vals?.packages?.[pkgIndex]?.sub_packages?.[subIndex];
    if (!sub) return;
    const filtered = (sub.consentForm || []).filter((_, i) => i !== consentIndex);
    sub.consentForm = filtered.length ? filtered : [{ question: "", is_required: "0" }];
    setValue("packages", vals.packages, { shouldTouch: true, shouldValidate: true });
  }

  // File handling: setValue('packageMedia_0', file) or setValue(`packages.${pIdx}.sub_packages.${sIdx}.item_images`, file)
  // The hook consumer is responsible for creating previews with URL.createObjectURL on the file value from watch(...)

  // Serializer: converts the validated object + attached File objects into FormData
  function serializeToFormData(values) {
    const fd = new FormData();
    fd.append("serviceId", String(values.serviceId));
    fd.append("serviceCategoryId", String(values.serviceCategoryId));
    if (values.packageMedia_0) fd.append("packageMedia_0", values.packageMedia_0);

    const packages = (values.packages || []).map((pkg, pkgIndex) => {
      const sub_packages = (pkg.sub_packages || []).map((sub, subIndex) => {
        // append file if present
        if (sub.item_images) fd.append(`itemMedia_${pkgIndex}_${subIndex}`, sub.item_images);
        // transform preferences to object keyed by title (like your old code)
        const prefsObj = (sub.preferences || []).reduce((acc, group) => {
          const key = (group.title && group.title.trim()) ? group.title.trim() : `preferences${Math.random().toString(36).slice(2, 7)}`;
          acc[key] = (group.items || []).map((it) => ({
            preference_id: it.preference_id,
            preference_value: it.preference_value || "",
            preference_price: it.preference_price || "",
            is_required: Number(it.is_required) || 0,
          }));
          return acc;
        }, {});
        const cleanedAddons = (sub.addons || []).map((a) => ({
          addon_name: a.addon_name || "",
          description: a.description || "",
          price: a.price || "",
          time_required: a.time_required || "",
        }));
        const cleanedConsent = (sub.consentForm || []).map((c) => ({
          question: c.question || "",
          is_required: Number(c.is_required) || 0,
        }));

        return {
          item_name: sub.item_name || "",
          description: sub.description || "",
          price: sub.price || "",
          time_required: sub.time_required || "",
          addons: cleanedAddons,
          preferences: prefsObj,
          consentForm: cleanedConsent,
        };
      });

      return {
        packageName: pkg.packageName || values.packageName || "",
        sub_packages,
      };
    });

    fd.append("packages", JSON.stringify(packages));
    return fd;
  }

  // optional: expose a reset helper
  function resetForm(vals = null) {
    reset(vals || dv);
  }

  return {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    errors,
    isValid,
    isSubmitting,
    packagesFieldArray: packagesFA,
    appendPackage,
    removePackage,
    appendSubPackage,
    removeSubPackage,
    addPreferenceGroup,
    removePreferenceGroup,
    addPreferenceItem,
    removePreferenceItem,
    addAddon,
    removeAddon,
    addConsent,
    removeConsent,
    serializeToFormData,
    resetForm,
  };
}
