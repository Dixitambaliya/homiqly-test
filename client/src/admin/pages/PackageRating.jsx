import { useState, useEffect } from "react";
import axios from "axios";
import { FiStar, FiUser, FiCalendar } from "react-icons/fi";
import { formatDate } from "../../shared/utils/dateUtils";
import LoadingSpinner from "../../shared/components/LoadingSpinner";

const PackageRating = () => {
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [ratings, setRatings] = useState([]);
  const [packageInfo, setPackageInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await axios.get("/api/admin/getallpackages");
      setPackages(res.data.packages || []);
    } catch (err) {
      console.error("Error fetching packages", err);
    }
  };

  const fetchRatings = async (packageId) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/rating/packageaverage/${packageId}`);
      setRatings(res.data.review.rating || []);
      setPackageInfo(res.data.review);
    } catch (err) {
      console.error("Error fetching package ratings", err);
      setRatings([]);
      setPackageInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePackageChange = (e) => {
    const packageId = e.target.value;
    setSelectedPackageId(packageId);
    if (packageId) fetchRatings(packageId);
  };

  const handleFilterChange = (e) => setFilter(e.target.value);
  const handleSearchChange = (e) => setSearchTerm(e.target.value.toLowerCase());

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={i < rating ? "text-yellow-400" : "text-gray-300"}
      >
        ★
      </span>
    ));

  const filteredRatings = ratings.filter((r) => {
    const matchesRating = filter === "all" || r.rating === parseInt(filter);
    const matchesSearch =
      !searchTerm || r.userName.toLowerCase().includes(searchTerm);
    return matchesRating && matchesSearch;
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Package Ratings</h2>

      {/* Dropdown */}
      <div className="mb-6">
        <select
          value={selectedPackageId}
          onChange={handlePackageChange}
          className="px-4 py-2 border rounded-md"
        >
          <option value="">Select a Package</option>
          {packages.map((pkg) => (
            <option key={pkg.package_id} value={pkg.package_id}>
              {pkg.packageName}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      ) : packageInfo ? (
        <div className="space-y-6">
          {/* Package Info */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col md:flex-row gap-6 items-center">
            {packageInfo.packageMedia && (
              <img
                src={packageInfo.packageMedia}
                alt="Package"
                className="w-32 h-32 object-cover rounded-md"
              />
            )}
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {packageInfo.packageName}
              </h3>
              <p className="text-gray-600 mb-2">{packageInfo.description}</p>
              <div className="text-yellow-400 text-4xl">
                {renderStars(Math.round(packageInfo.average_rating))}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Average Rating: {packageInfo.average_rating} (
                {packageInfo.total_reviews}{" "}
                {packageInfo.total_reviews === 1 ? "review" : "reviews"})
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 border-b flex flex-col md:flex-row justify-between gap-4 md:items-center">
            <h3 className="text-lg font-medium text-gray-800">Reviews</h3>

            <div className="flex gap-2 flex-col md:flex-row">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by user..."
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full md:w-64"
              />

              <select
                value={filter}
                onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>

          {/* Review Cards */}
          {filteredRatings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRatings.map((r) => (
                <div
                  key={r.rating_id}
                  className="bg-white border rounded-lg p-5 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div className="mr-3 bg-gray-100 rounded-full p-2">
                        <FiUser className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {r.userName}
                        </h4>
                        <div className="flex items-center text-sm text-gray-500">
                          <FiCalendar className="mr-1" />
                          {formatDate(r.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex text-yellow-400 text-xl">
                      {renderStars(r.rating)}
                    </div>
                  </div>

                  <div className="ml-12">
                    <p className="text-gray-700">
                      {r.review || "No written review provided."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No matching reviews found.
            </div>
          )}
        </div>
      ) : selectedPackageId ? (
        <div className="p-8 text-center text-gray-500">No reviews found.</div>
      ) : null}
    </div>
  );
};

export default PackageRating;
