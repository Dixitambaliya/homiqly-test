export const SectionCard = ({ title, children, className = "" }) => (
  <div
    className={`bg-white rounded-xl  shadow-sm ${className}`}
  >
    <div className="px-6 py-4 border-b border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);
