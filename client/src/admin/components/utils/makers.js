// FILE: src/components/utils/makers.js
export const makeEmptyPreferenceItem = () => ({
  preference_id: undefined,
  preference_value: "",
  preference_price: "",
  is_required: "0",
});
export const makeEmptyPreferenceGroup = (title = "") => ({
  title,
  items: [makeEmptyPreferenceItem()],
});
export const makeEmptySubPackage = () => ({
  item_name: "",
  description: "",
  item_images: null,
  price: "",
  time_required: "",
  preferences: [makeEmptyPreferenceGroup("Default")],
  addons: [{ addon_name: "", description: "", price: "", time_required: "" }],
  consentForm: [{ question: "", is_required: "0" }],
});
export const makeEmptyPackage = () => ({
  sub_packages: [makeEmptySubPackage()],
});
