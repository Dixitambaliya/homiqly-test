import { useState, useEffect } from "react";
import axios from "axios";
import { FiStar, FiUser, FiCalendar, FiTrash2 } from "react-icons/fi";
import LoadingSlider from "../../shared/components/LoadingSpinner";
import { formatDate } from "../../shared/utils/dateUtils";
import IconButton from "../../shared/components/Button/IconButton";

const UserRating = () => {
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
      const res = await axios.get("/api/rating/getpackagebookedrating");
      setRatings(res.data.rating || []);
    } catch (err) {
      console.error("Error fetching ratings:", err);
      setError("Failed to load ratings");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ratingId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this rating?"
    );
    if (!confirmed) return;

    try {
      await axios.delete(`/api/notification/deleterating/${ratingId}`);
      fetchRatings(); // Refresh list after deletion
    } catch (err) {
      alert("Failed to delete rating.");
      console.error(err);
    }
  };

  const handleFilterChange = (e) => setFilter(e.target.value);
  const handleSearchChange = (e) => setSearchTerm(e.target.value.toLowerCase());

  const filteredRatings = ratings.filter((r) => {
    const matchesRating = filter === "all" || r.rating === parseInt(filter);
    const matchesSearch =
      !searchTerm ||
      r.userName.toLowerCase().includes(searchTerm) ||
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
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach((r) => distribution[r.rating]++);
    return distribution;
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
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Package Ratings & Reviews
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
            <div className="flex text-4xl text-yellow-400 mb-2">
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
                  <div className="flex items-center text-yellow-400 mr-2">
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

      {/* Review Filters */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex flex-col md:flex-row justify-between gap-4 md:items-center">
          <h3 className="text-lg font-medium text-gray-800">
            Customer Reviews
          </h3>

          <div className="flex gap-2 flex-col md:flex-row">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by user name..."
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

        {filteredRatings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {filteredRatings.map((rating) => (
              <div
                key={rating.rating_id}
                className="bg-white border rounded-lg p-5 shadow-sm space-y-2 relative"
              >
                {/* Delete Button */}
                <IconButton
                  aria-label="Delete Rating"
                  icon={<FiTrash2 className="h-5 w-5" />}
                  variant="danger"
                  onClick={() => handleDelete(rating.rating_id)}
                  className="absolute bottom-3 right-3 "
                  title="Delete Rating"
                ></IconButton>

                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <div className="mr-3 bg-gray-100 rounded-full p-2">
                      <FiUser className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {rating.userName}
                      </h4>
                      <div className="flex items-center text-sm text-gray-500">
                        <FiCalendar className="mr-1" />
                        {formatDate(rating.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex text-yellow-400 text-xl">
                    {renderStars(rating.rating)}
                  </div>
                </div>

                <div className="ml-12 space-y-1">
                  <p className="text-gray-700">
                    {rating.review || "No written review provided."}
                  </p>
                  <div className="text-md text-gray-600">
                    Vendor : {rating.vendor_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    Package: {rating.packageName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {filter === "all" && searchTerm === ""
              ? "No reviews yet."
              : "No matching reviews found."}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserRating;
