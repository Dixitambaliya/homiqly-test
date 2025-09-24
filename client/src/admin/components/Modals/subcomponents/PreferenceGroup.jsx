// FILE: src/components/subcomponents/PreferenceGroup.jsx
import React from "react";
// import ItemCard from "../../../shared/components/Card/ItemCard";
import { Button } from "../../../../shared/components/Button";
import { FormInput, FormSelect } from "../../../../shared/components/Form";
import CollapsibleSectionCard from "../../../../shared/components/Card/CollapsibleSectionCard";
import { FiPlus } from "react-icons/fi";

const PreferenceGroup = ({ preferences = [], onChange }) => {
  const updateGroup = (gi, next) =>
    onChange(preferences.map((g, i) => (i === gi ? next : g)));
  const addItemToGroup = (gi) =>
    updateGroup(gi, {
      ...preferences[gi],
      items: [
        ...(preferences[gi]?.items || []),
        {
          preference_id: undefined,
          preference_value: "",
          preference_price: "",
          is_required: "0",
        },
      ],
    });
  const removeItemFromGroup = (gi, ii) =>
    updateGroup(gi, {
      ...preferences[gi],
      items: (preferences[gi]?.items || []).filter((_, i) => i !== ii) || [
        {
          preference_id: undefined,
          preference_value: "",
          preference_price: "",
          is_required: "0",
        },
      ],
    });

  const setGroupTitle = (gi, title) =>
    updateGroup(gi, { ...preferences[gi], title });
  const setItemField = (gi, ii, field, val) =>
    updateGroup(gi, {
      ...preferences[gi],
      items: preferences[gi].items.map((it, i) =>
        i === ii ? { ...it, [field]: val } : it
      ),
    });

  return (
    <CollapsibleSectionCard className="mt-6" title={`Preference Group `}>
      <div className="flex justify-between items-center mb-3">
        <div />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() =>
              onChange([
                ...preferences,
                {
                  title: "",
                  items: [
                    {
                      preference_id: undefined,
                      preference_value: "",
                      preference_price: "",
                      is_required: "0",
                    },
                  ],
                },
              ])
            }
          >
            + Add Group
          </Button>
        </div>
      </div>

      {preferences.length === 0 && (
        <p className="text-sm text-gray-500 italic">No preference groups</p>
      )}

      {preferences.map((group, groupIndex) => (
        <div
          key={groupIndex}
          className="mb-4 p-4 border rounded-lg bg-white shadow-sm"
        >
          <div className="flex justify-between mb-2 items-center gap-4">
            <div className="flex-1">
              <FormInput
                label="Group Title"
                value={group.title || ""}
                onChange={(e) => setGroupTitle(groupIndex, e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                size="xs"
                variant="outline"
                onClick={() => addItemToGroup(groupIndex)}
              >
                + Add Item
              </Button>
              <Button
                size="xs"
                variant="error"
                onClick={() =>
                  onChange(preferences.filter((_, i) => i !== groupIndex))
                }
              >
                Remove Group
              </Button>
            </div>
          </div>

          {(group.items || []).map((pref, prefIndex) => (
            <div key={prefIndex} className="mb-2">
              <div className="grid md:grid-cols-3 gap-3 my-2 items-end">
                <FormInput
                  label={`Value ${prefIndex + 1}`}
                  value={pref.preference_value}
                  onChange={(e) =>
                    setItemField(
                      groupIndex,
                      prefIndex,
                      "preference_value",
                      e.target.value
                    )
                  }
                  className="flex-1 min-w-[120px]"
                />
                <FormInput
                  label="Price"
                  type="number"
                  value={pref.preference_price ?? ""}
                  onChange={(e) =>
                    setItemField(
                      groupIndex,
                      prefIndex,
                      "preference_price",
                      e.target.value
                    )
                  }
                  className="w-28"
                />
                <div>
                  <FormSelect
                    label="Required?"
                    name={`pref_is_required_${groupIndex}_${prefIndex}`}
                    value={String(pref.is_required ?? 0)}
                    onChange={(e) =>
                      setItemField(
                        groupIndex,
                        prefIndex,
                        "is_required",
                        e.target.value
                      )
                    }
                    options={[
                      { value: "0", label: "Optional (0)" },
                      { value: "1", label: "Required (1)" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => removeItemFromGroup(groupIndex, prefIndex)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <Button
        variant="outline"
        icon={<FiPlus />}
        className="w-full border-dashed mt-4"
        onClick={() =>
          onChange([
            ...preferences,
            {
              title: "",
              items: [
                {
                  preference_id: undefined,
                  preference_value: "",
                  preference_price: "",
                  is_required: "0",
                },
              ],
            },
          ])
        }
      >
        {" "}
        Add New Preference Group
      </Button>
    </CollapsibleSectionCard>
  );
};

export default PreferenceGroup;
