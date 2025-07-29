import { useState } from "react";
import axios from "axios"; // ✅ make sure this is here
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
      onClose(); // close modal
    } catch (error) {
      toast.error("Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate Your Experience">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Rating (1-5)
          </label>
          <select
            className="w-full mt-1 p-2 border rounded"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            <option value="">Select</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

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

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            {...(loading ? { disabled: true } : {})}
          >
            {loading ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RatingModal;
