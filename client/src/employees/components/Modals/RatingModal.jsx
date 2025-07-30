import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Modal from "../../../shared/components/Modal/Modal";
import { Button } from "../../../shared/components/Button";

const RatingModal = ({ isOpen, onClose, bookingId }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rating || !review.trim()) {
      toast.error("Please provide both rating and review");
      return;
    }

    try {
      setLoading(true);
      await axios.post("/api/rating/add-rating", {
        booking_id: bookingId,
        rating,
        review,
      });

      toast.success("Rating submitted successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate Your Experience">
      <div className="space-y-4">
        {/* ⭐ Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating
          </label>
          <div className="rating flex flex-row-reverse justify-end gap-1">
            {[1, 2, 3, 4, 5].reverse().map((star) => (
              <label key={star}>
                <input
                  type="radio"
                  name="rate"
                  value={star}
                  checked={rating === star}
                  onChange={() => setRating(star)}
                  className="sr-only"
                />
                <svg
                  viewBox="0 0 576 512"
                  height="1.5em"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`transition-colors duration-200 ${
                    rating >= star ? "fill-yellow-400" : "fill-gray-400"
                  }`}
                >
                  <path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z" />
                </svg>
              </label>
            ))}
          </div>
        </div>

        {/* ✍️ Review Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Review
          </label>
          <textarea
            className="w-full mt-1 p-2 border rounded"
            rows={4}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          ></textarea>
        </div>

        {/* ✅ Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RatingModal;
