import { useState, useEffect } from "react";
import axios from "axios";
import {
  FiStar,
  FiUser,
  FiCalendar,
  FiPhone,
  FiMail,
  FiTrash2,
} from "react-icons/fi";
import LoadingSlider from "../../shared/components/LoadingSpinner";
import { formatDate } from "../../shared/utils/dateUtils";
import IconButton from "../../shared/components/Button/IconButton";

const VendorRating = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/rating/getallvendorsrating");
      setRatings(res.data.ratings || []);
    } catch (err) {
      console.error("Error fetching vendor ratings:", err);
      setError("Failed to load vendor ratings.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ratingId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this rating?"
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`/api/notification/deletevendorsrating/${ratingId}`);
      fetchRatings(); // Refresh list
    } catch (err) {
      alert("Failed to delete rating.");
      console.error("Delete error:", err);
    }
  };

  const handleFilterChange = (e) => setFilter(e.target.value);
  const handleSearchChange = (e) => setSearchTerm(e.target.value.toLowerCase());

  const filteredRatings = ratings.filter((r) => {
    const matchesRating = filter === "all" || r.rating === parseInt(filter);
    const matchesSearch =
      !searchTerm ||
      r.user_name.toLowerCase().includes(searchTerm) ||
      r.vendor_name.toLowerCase().includes(searchTerm);
    return matchesRating && matchesSearch;
  });

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={i < rating ? "text-yellow-400" : "text-gray-300"}
      >
        ★
      </span>
    ));

  const getRatingDistribution = () => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach((r) => dist[r.rating]++);
    return dist;
  };

  const distribution = getRatingDistribution();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSlider />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">{error}</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Vendor Ratings & Reviews
      </h2>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row">
          <div className="flex-1 flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-gray-200">
            <div className="text-5xl font-bold text-primary-dark mb-2">
              {ratings.length > 0
                ? (
                    ratings.reduce((sum, r) => sum + r.rating, 0) /
                    ratings.length
                  ).toFixed(1)
                : "0.0"}
            </div>
            <div className="flex text-yellow-400 mb-2 text-4xl">
              {renderStars(
                Math.round(
                  ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                )
              )}
            </div>
            <div className="text-sm text-gray-500">
              Based on {ratings.length}{" "}
              {ratings.length === 1 ? "review" : "reviews"}
            </div>
          </div>

          <div className="flex-1 p-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Rating Distribution
            </h3>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = distribution[rating] || 0;
              const percentage =
                ratings.length > 0
                  ? Math.round((count / ratings.length) * 100)
                  : 0;
              return (
                <div key={rating} className="flex items-center mb-2">
                  <div className="flex items-center text-yellow-400 mr-2 ">
                    {rating} <FiStar className="ml-1" />
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-light rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="ml-2 text-sm text-gray-500 w-16">
                    {count} ({percentage}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex flex-col md:flex-row justify-between gap-4 md:items-center">
          <h3 className="text-lg font-medium text-gray-800">Vendor Reviews</h3>

          <div className="flex gap-2 flex-col md:flex-row">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by user or vendor..."
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

        {/* Ratings Display */}
        {filteredRatings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {filteredRatings.map((r) => (
              <div
                key={r.rating_id}
                className="bg-white border rounded-lg p-5 shadow-sm space-y-2 relative"
              >
                {/* Delete button */}
                <IconButton
                  aria-label="Delete Rating"
                  variant="danger"
                  onClick={() => handleDelete(r.rating_id)}
                  className="absolute bottom-3 right-3 "
                  title="Delete Rating"
                  icon={<FiTrash2 className="h-5 w-5" />}
                >
                </IconButton>

                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <div className="mr-3 bg-gray-100 rounded-full p-2">
                      <FiUser className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {r.vendor_name}
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

                <div className="ml-12 space-y-1">
                  <p className="text-gray-700">
                    {r.review || "No written review."}
                  </p>
                  <div className="text-sm text-gray-600">
                    User: {r.user_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    Vendor Type: {r.vendorType}
                  </div>
                  <div className="text-sm text-gray-500">
                    Service: {r.serviceName} - {r.serviceCategory}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {searchTerm || filter !== "all"
              ? "No matching reviews found."
              : "No vendor reviews available."}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorRating;
