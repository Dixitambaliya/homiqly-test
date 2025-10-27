// FILE: src/components/subcomponents/SubPackageSection.jsx
import React, { useState, useEffect } from "react";
import { FiTrash, FiPlus } from "react-icons/fi";
import CollapsibleSectionCard from "../../../../shared/components/Card/CollapsibleSectionCard";
// import ItemCard from "../../../shared/components/Card/ItemCard";
import { Button, IconButton } from "../../../../shared/components/Button";
import {
  FormInput,
  FormTextarea,
  FormSelect,
} from "../../../../shared/components/Form";
import { CustomFileInput } from "../../../../shared/components/CustomFileInput";
import PreferenceGroup from "./PreferenceGroup";
import AddonList from "./AddonList";
import ConsentList from "./ConsentList";

const SubPackageSection = ({
  pkgIndex,
  subIndex,
  sub = {},
  onChange,
  onRemove,
}) => {
  // keep a local copy of sub (for simpler updates) and bubble up via onChange
  const [local, setLocal] = useState(sub);

  useEffect(() => setLocal(sub), [sub]);
  useEffect(() => onChange && onChange(local), [local]);

  const setField = (field, value) =>
    setLocal((p) => ({ ...p, [field]: value }));

  const handleFile = (fileOrEvent) => {
    const file = fileOrEvent?.target?.files
      ? fileOrEvent.target.files[0]
      : fileOrEvent;
    setField("item_images", file || null);
  };

  const removeImage = () => setField("item_images", null);

  return (
    <CollapsibleSectionCard
      title={`Sub-Package ${subIndex + 1}`}
      className="mb-6"
    >
      <div className="flex justify-end mb-4">
        <IconButton
          icon={<FiTrash />}
          variant="lightDanger"
          onClick={onRemove}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <FormInput
          label="Item Name"
          value={local.item_name || ""}
          onChange={(e) => setField("item_name", e.target.value)}
          required
        />
        <FormInput
          label="Price"
          type="number"
          value={local.price || ""}
          onChange={(e) => setField("price", e.target.value)}
        />
        <FormInput
          type="number"
          label="Time Required (in minutes only)"
          value={local.time_required || ""}
          onChange={(e) => setField("time_required", e.target.value)}
        />

        <div className="md:col-span-2">
          <FormTextarea
            rows={4}
            label="Description (Optional)"
            value={local.description || ""}
            onChange={(e) => setField("description", e.target.value)}
          />
        </div>

        <CustomFileInput
          label="Image"
          onChange={handleFile}
          preview={local._preview || null}
          onRemove={removeImage}
        />
      </div>

      <PreferenceGroup
        preferences={local.preferences || []}
        onChange={(prefs) => setField("preferences", prefs)}
      />

      <AddonList
        addons={
          local.addons || [
            { addon_name: "", description: "", price: "", time_required: "" },
          ]
        }
        onChange={(a) => setField("addons", a)}
      />

      <ConsentList
        consentForm={local.consentForm || [{ question: "", is_required: "0" }]}
        onChange={(c) => setField("consentForm", c)}
      />
    </CollapsibleSectionCard>
  );
};

export default SubPackageSection;
