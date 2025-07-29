// components/shared/Breadcrumb.jsx
import { Link, useNavigate } from "react-router-dom";

const Breadcrumb = ({ links = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-4">
      <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          {links.map((link, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && <span className="mx-1">/</span>}
              {link.to ? (
                <Link
                  to={link.to}
                  className="hover:text-gray-900 text-blue-600 font-medium"
                >
                  {link.label}
                </Link>
              ) : (
                <span className="text-gray-700 font-semibold">
                  {link.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-700 hover:text-gray-800 hover:underline  px-3 py-1 rounded"
      >
        ← Back
      </button>
    </div>
  );
};

export default Breadcrumb;
