export const TabButton = ({ id, label, icon: Icon, isActive, onClick, ...rest }) => (
  <button
    type="button"
    onClick={onClick}
    {...rest}
    className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg font-medium border-2 transition-all duration-300 ${
      isActive
        ? "bg-green-50 text-green-700 border-2 border-green-200  transition-all duration-300"
        : "text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-all duration-300 "
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);
