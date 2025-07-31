import { Link, useNavigate } from "react-router-dom";

const Breadcrumb = ({ links = [] }) => {
  const navigate = useNavigate();
  const lastIndex = links.length - 1;

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex flex-col ">
        {/* ← Back link */}
        <button onClick={() => navigate(-1)} className=" flex items-center ">
          ‹{" "}
          <span className="text-2xl font-bold text-gray-900 hover:underline px-3">
            {" "}
            Back
          </span>
        </button>

        {/* Breadcrumb trail */}
        <nav className="text-sm text-gray-500 px-5 py-3" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            {links.map((link, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && <span className="mx-2">•</span>}
                {index !== lastIndex && link.to ? (
                  <Link
                    to={link.to}
                    className="text-gray-700 hover:text-black hover:underline transition"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <span className="text-gray-400">{link.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
};

export default Breadcrumb;
