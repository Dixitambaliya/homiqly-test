import { IconButton } from "../Button";
import { Trash } from "lucide-react";

const ItemCard = ({ title, children, onRemove, showRemove = true }) => (
  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
    <div className="flex justify-between items-center mb-4">
      <h4 className="font-medium text-gray-900">{title}</h4>
      {showRemove && (
        <IconButton
          variant="lightDanger"
          icon={<Trash />}
          onClick={onRemove}
          className="!p-2"
        />
      )}
    </div>
    {children}
  </div>
);
export default ItemCard;
