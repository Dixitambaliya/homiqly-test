// FILE: src/components/subcomponents/AddonList.jsx
import React from "react";
import ItemCard from "../../../../shared/components/Card/ItemCard";
import { Button } from "../../../../shared/components/Button";
import { FormInput } from "../../../../shared/components/Form";
import CollapsibleSectionCard from "../../../../shared/components/Card/CollapsibleSectionCard";

const AddonList = ({ addons = [], onChange }) => {
  const setAddonField = (i, field, val) =>
    onChange(addons.map((a, idx) => (idx === i ? { ...a, [field]: val } : a)));
  const add = () =>
    onChange([
      ...addons,
      { addon_name: "", description: "", price: "", time_required: "" },
    ]);
  const remove = (i) =>
    onChange(
      addons.filter((_, idx) => idx !== i).length
        ? addons.filter((_, idx) => idx !== i)
        : [{ addon_name: "", description: "", price: "", time_required: "" }]
    );

  return (
    <CollapsibleSectionCard className="mt-4" title={`Addons`}>
      {addons.map((addon, i) => (
        <ItemCard
          key={i}
          title={`Add-on ${i + 1}`}
          showRemove={addons.length > 1}
          onRemove={() => remove(i)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Add-on Name"
              value={addon.addon_name}
              onChange={(e) => setAddonField(i, "addon_name", e.target.value)}
            />
            <FormInput
              label="Price"
              type="number"
              value={addon.price}
              onChange={(e) => setAddonField(i, "price", e.target.value)}
            />
            <FormInput
              label="Description (Optional)"
              value={addon.description}
              onChange={(e) => setAddonField(i, "description", e.target.value)}
            />
            <FormInput
              type="number"
              label="Time Required (in minutes only)"
              value={addon.time_required}
              onChange={(e) =>
                setAddonField(i, "time_required", e.target.value)
              }
            />
          </div>
        </ItemCard>
      ))}

      <Button
        variant="outline"
        icon={null}
        className="w-full border-dashed mt-2"
        onClick={add}
      >
        Add Add-on
      </Button>
    </CollapsibleSectionCard>
  );
};

export default AddonList;
