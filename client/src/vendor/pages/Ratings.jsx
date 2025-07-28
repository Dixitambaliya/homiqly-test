import { useState, useEffect } from "react";
import axios from "axios";
import { FiStar, FiUser, FiCalendar } from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { formatDate } from "../../shared/utils/dateUtils";

const Ratings = () => {
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({
    average_rating: 0,
    total_reviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all, 5, 4, 3, 2, 1

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/rating/getrating");
      setRatings(response.data.ratings || []);
      setStats({
        average_rating: response.data.average_rating || 0,
        total_reviews: response.data.total_reviews || 0,
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      setError("Failed to load ratings");
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const filteredRatings = ratings.filter((rating) => {
    if (filter === "all") return true;
    return rating.rating === parseInt(filter);
  });

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={i <= rating ? "text-yellow-400" : "text-gray-300"}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  const getRatingDistribution = () => {
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    ratings.forEach((rating) => {
      distribution[rating.rating]++;
    });

    return distribution;
  };

  const distribution = getRatingDistribution();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
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
        Ratings & Reviews
      </h2>

      {/* Rating Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row">
          <div className="flex-1 flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-gray-200">
            <div className="text-5xl font-bold text-primary-dark mb-2">
              {stats.average_rating
                ? typeof stats.average_rating === "number"
                  ? stats.average_rating.toFixed(1)
                  : stats.average_rating
                : "0.0"}
            </div>
            <div className="flex text-2xl text-yellow-400 mb-2">
              {renderStars(Math.round(stats.average_rating))}
            </div>
            <div className="text-sm text-gray-500">
              Based on {stats.total_reviews}{" "}
              {stats.total_reviews === 1 ? "review" : "reviews"}
            </div>
          </div>

          <div className="flex-1 p-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Rating Distribution
            </h3>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = distribution[rating] || 0;
              const percentage =
                stats.total_reviews > 0
                  ? Math.round((count / stats.total_reviews) * 100)
                  : 0;

              return (
                <div key={rating} className="flex items-center mb-2">
                  <div className="flex text-yellow-400 mr-2">
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

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-800">
            Customer Reviews
          </h3>
          <div>
            <select
              value={filter}
              onChange={handleFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
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
          <div className="divide-y divide-gray-200">
            {filteredRatings.map((rating) => (
              <div key={rating.rating_id} className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <div className="mr-3 bg-gray-100 rounded-full p-2">
                      <FiUser className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {rating.user_name}
                      </h4>
                      <div className="flex items-center text-sm text-gray-500">
                        <FiCalendar className="mr-1" />
                        {formatDate(rating.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex text-yellow-400">
                    {renderStars(rating.rating)}
                  </div>
                </div>

                <div className="ml-10">
                  <p className="text-gray-700 mb-2">
                    {rating.review || "No written review provided."}
                  </p>
                  <div className="text-sm text-gray-500">
                    Service: {rating.serviceName?.trim()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            {filter === "all"
              ? "No reviews yet. Completed bookings will appear here when customers leave reviews."
              : `No ${filter}-star reviews yet.`}
          </div>
        )}
      </div>
    </div>
  );
};

export default Ratings;
