import { FiTrash2 } from "react-icons/fi";
import { IconButton } from "../Button";

const ItemCard = ({ title, children, onRemove, showRemove = true }) => (
  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
    <div className="flex justify-between items-center mb-4">
      <h4 className="font-medium text-gray-900">{title}</h4>
      {showRemove && (
        <IconButton
          variant="lightDanger"
          icon={<FiTrash2 />}
          onClick={onRemove}
          className="!p-2"
        />
      )}
    </div>
    {children}
  </div>
);
export default ItemCard;
