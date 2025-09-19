// FILE: src/components/subcomponents/ConsentList.jsx
import React from "react";
import ItemCard from "../../../../shared/components/Card/ItemCard";
import { Button } from "../../../../shared/components/Button";
import { FormInput, FormSelect } from "../../../../shared/components/Form";
import CollapsibleSectionCard from "../../../../shared/components/Card/CollapsibleSectionCard";

const ConsentList = ({ consentForm = [], onChange }) => {
  const update = (i, next) =>
    onChange(consentForm.map((c, idx) => (idx === i ? next : c)));
  const add = () =>
    onChange([...consentForm, { question: "", is_required: "0" }]);
  const remove = (i) =>
    onChange(
      consentForm.filter((_, idx) => idx !== i).length
        ? consentForm.filter((_, idx) => idx !== i)
        : [{ question: "", is_required: "0" }]
    );

  return (
    <CollapsibleSectionCard title="Consent Form" className="my-2">
      <div>
        {consentForm.map((c, i) => (
          <ItemCard
            key={i}
            title={`Consent Item ${i + 1}`}
            showRemove={consentForm.length > 1}
            onRemove={() => remove(i)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Consent Statement"
                placeholder="Enter consent statement"
                value={c.question}
                onChange={(e) => update(i, { ...c, question: e.target.value })}
              />
              <FormSelect
                label="Required?"
                value={c.is_required}
                onChange={(e) =>
                  update(i, { ...c, is_required: e.target.value })
                }
                options={[
                  { label: "Required", value: "1" },
                  { label: "Optional", value: "0" },
                ]}
                placeholder="Select option"
              />
            </div>
          </ItemCard>
        ))}

        <Button
          variant="outline"
          onClick={add}
          className="w-full border-dashed"
        >
          Add Consent Item
        </Button>
      </div>
    </CollapsibleSectionCard>
  );
};

export default ConsentList;
