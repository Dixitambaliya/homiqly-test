import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiPlus, FiEdit, FiTrash2, FiPackage, FiX } from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import { formatCurrency } from "../../shared/utils/formatUtils";
import { Button } from "../../shared/components/Button";

const SupplyKits = () => {
  const [supplyKits, setSupplyKits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedKit, setSelectedKit] = useState(null);
  const [formData, setFormData] = useState({
    kit_name: "",
    kit_description: "",
    kit_price: "",
    service_categories_id: "",
    kit_image: null,
    items: [
      { item_name: "", item_description: "", quantity: 1, unit_price: "" },
    ],
  });
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch supply kits
      const kitsResponse = await axios.get("/api/supplykit/all");
      setSupplyKits(kitsResponse.data.supply_kits || []);

      // Fetch categories for dropdown
      const categoriesResponse = await axios.get(
        "/api/service/getservicecategories"
      );
      setCategories(categoriesResponse.data.categories || []);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching supply kits data:", error);
      setError("Failed to load supply kits");
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        kit_image: file,
      }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { item_name: "", item_description: "", quantity: 1, unit_price: "" },
      ],
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = [...formData.items];
      updatedItems.splice(index, 1);
      setFormData((prev) => ({
        ...prev,
        items: updatedItems,
      }));
    } else {
      toast.warning("Supply kit must have at least one item");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.kit_name ||
      !formData.kit_price ||
      !formData.service_categories_id
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!formData.items.every((item) => item.item_name && item.unit_price)) {
      toast.error("Please fill all required item fields");
      return;
    }

    try {
      setSubmitting(true);

      const formDataToSend = new FormData();
      formDataToSend.append("kit_name", formData.kit_name);
      formDataToSend.append("kit_description", formData.kit_description || "");
      formDataToSend.append("kit_price", formData.kit_price);
      formDataToSend.append(
        "service_categories_id",
        formData.service_categories_id
      );

      if (formData.kit_image) {
        formDataToSend.append("kit_image", formData.kit_image);
      }

      formDataToSend.append("items", JSON.stringify(formData.items));

      let response;
      if (showAddModal) {
        response = await axios.post("/api/supplykit/create", formDataToSend, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        formDataToSend.append("kit_id", selectedKit.kit_id);
        response = await axios.put(
          `/api/supplykit/update/${selectedKit.kit_id}`,
          formDataToSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      if (response.status === 200 || response.status === 201) {
        toast.success(
          `Supply kit ${showAddModal ? "created" : "updated"} successfully`
        );
        setShowAddModal(false);
        setShowEditModal(false);
        resetForm();
        fetchData(); // Refresh the list
      }
    } catch (error) {
      console.error("Error submitting supply kit:", error);
      toast.error(
        error.response?.data?.message ||
          `Failed to ${showAddModal ? "create" : "update"} supply kit`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      kit_name: "",
      kit_description: "",
      kit_price: "",
      service_categories_id: "",
      kit_image: null,
      items: [
        { item_name: "", item_description: "", quantity: 1, unit_price: "" },
      ],
    });
    setImagePreview(null);
  };

  const editKit = (kit) => {
    setSelectedKit(kit);
    setFormData({
      kit_name: kit.kit_name,
      kit_description: kit.kit_description || "",
      kit_price: kit.kit_price,
      service_categories_id: kit.service_categories_id,
      kit_image: null,
      items: kit.items || [
        { item_name: "", item_description: "", quantity: 1, unit_price: "" },
      ],
    });
    setImagePreview(kit.kit_image);
    setShowEditModal(true);
  };

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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Supply Kit Management
        </h2>
        <Button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <FiPlus className="mr-2" />
          Add Supply Kit
        </Button>
      </div>

      {supplyKits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {supplyKits.map((kit) => (
            <div
              key={kit.kit_id}
              className="bg-white rounded-lg shadow overflow-hidden"
            >
              {kit.kit_image && (
                <img
                  src={kit.kit_image}
                  alt={kit.kit_name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{kit.kit_name}</h3>
                  <div className="flex">
                    <button
                      onClick={() => editKit(kit)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      <FiEdit className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {kit.kit_description}
                </p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(kit.kit_price)}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1">
                    {kit.serviceCategory}
                  </span>
                </div>

                {kit.items && kit.items.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FiPackage className="mr-1" /> Kit Contents
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {kit.items.map((item) => (
                        <li key={item.item_id} className="flex justify-between">
                          <span>
                            {item.item_name} ({item.quantity}x)
                          </span>
                          <span className="text-gray-500">
                            {formatCurrency(item.unit_price)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No supply kits found.</p>
        </div>
      )}

      {/* Add/Edit Supply Kit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                {showAddModal ? "Add New Supply Kit" : "Edit Supply Kit"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="kit_name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Kit Name*
                  </label>
                  <input
                    type="text"
                    id="kit_name"
                    name="kit_name"
                    value={formData.kit_name}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>

                <div>
                  <label
                    htmlFor="kit_price"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Kit Price ($)*
                  </label>
                  <input
                    type="number"
                    id="kit_price"
                    name="kit_price"
                    value={formData.kit_price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>

                <div>
                  <label
                    htmlFor="service_categories_id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Service Category*
                  </label>
                  <select
                    id="service_categories_id"
                    name="service_categories_id"
                    value={formData.service_categories_id}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option
                        key={category.serviceCategoryId}
                        value={category.serviceCategoryId}
                      >
                        {category.serviceCategory}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="kit_image"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Kit Image{showAddModal ? "*" : ""}
                  </label>
                  <input
                    type="file"
                    id="kit_image"
                    name="kit_image"
                    onChange={handleImageChange}
                    accept="image/*"
                    required={showAddModal}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-32 object-cover rounded-md"
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="kit_description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="kit_description"
                    name="kit_description"
                    value={formData.kit_description}
                    onChange={handleInputChange}
                    rows="3"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  ></textarea>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-medium text-gray-700">
                    Kit Items*
                  </h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
                  >
                    <FiPlus className="mr-1" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 border border-gray-200 rounded-md bg-gray-50"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="text-sm font-medium">
                          Item {index + 1}
                        </h5>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`item_name_${index}`}
                            className="block text-xs font-medium text-gray-500 mb-1"
                          >
                            Item Name*
                          </label>
                          <input
                            type="text"
                            id={`item_name_${index}`}
                            value={item.item_name}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "item_name",
                                e.target.value
                              )
                            }
                            required
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`item_description_${index}`}
                            className="block text-xs font-medium text-gray-500 mb-1"
                          >
                            Description
                          </label>
                          <input
                            type="text"
                            id={`item_description_${index}`}
                            value={item.item_description}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "item_description",
                                e.target.value
                              )
                            }
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`quantity_${index}`}
                            className="block text-xs font-medium text-gray-500 mb-1"
                          >
                            Quantity*
                          </label>
                          <input
                            type="number"
                            id={`quantity_${index}`}
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            required
                            min="1"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light text-sm"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`unit_price_${index}`}
                            className="block text-xs font-medium text-gray-500 mb-1"
                          >
                            Unit Price ($)*
                          </label>
                          <input
                            type="number"
                            id={`unit_price_${index}`}
                            value={item.unit_price}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "unit_price",
                                e.target.value
                              )
                            }
                            required
                            min="0"
                            step="0.01"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark disabled:opacity-50 flex items-center"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span className="ml-2">Submitting...</span>
                    </>
                  ) : showAddModal ? (
                    "Create Supply Kit"
                  ) : (
                    "Update Supply Kit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplyKits;
