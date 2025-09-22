import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiRefreshCw, FiX, FiEdit, FiSearch } from "react-icons/fi";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import UsersTable from "../components/Tables/UsersTable"; // Adjust path as needed
import FormInput from "../../shared/components/Form/FormInput"; // Adjust path as needed
import { Button, IconButton } from "../../shared/components/Button";
import FormSelect from "../../shared/components/Form/FormSelect";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    is_approved: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  // Search term for filtering users
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/admin/getusers");
      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users");
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const viewUserDetails = (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const editUser = (user) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      is_approved: user.is_approved ?? 1,
    });
    setShowEditModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      const response = await axios.put(
        `/api/admin/editusers/${selectedUser.user_id}`,
        formData
      );
      if (response.status === 200) {
        toast.success("User updated successfully");
        setShowEditModal(false);
        setUsers(
          users.map((user) =>
            user.user_id === selectedUser.user_id
              ? { ...user, ...formData }
              : user
          )
        );
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error.response?.data?.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await axios.delete(`/api/admin/deleteusers/${userId}`);
      toast.success("User deleted successfully");
      setUsers(users.filter((user) => user.user_id !== userId));
    } catch (error) {
      console.error("Error deleting user", error);
      toast.error("Failed to delete user");
    }
  };

  // Search input change handler
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Filtered users derived from searchTerm
  const filteredUsers = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const first = (u.firstName || "").toLowerCase();
      const last = (u.lastName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      // match anywhere in first, last, or email
      return (
        first.includes(term) ||
        last.includes(term) ||
        email.includes(term) ||
        // also allow matching combined "first last"
        `${first} ${last}`.includes(term)
      );
    });
  }, [users, searchTerm]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search box */}
          <div className="w-full sm:w-80">
            <FormInput
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by first name, last name or email..."
              icon={<FiSearch />}
            />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchUsers}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
          >
            <FiRefreshCw className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-500">{error}</p>
        </div>
      ) : (
        <UsersTable
          users={filteredUsers}
          isLoading={loading}
          onViewUser={viewUserDetails}
          onEditUser={editUser}
          onDelete={handleDelete}
        />
      )}

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">User Details</h3>
              <IconButton
                icon={<FiX />}
                variant="lightDanger"
                onClick={() => setShowDetailsModal(false)}
              />
            </div>
            <div className="p-4">
              <div className="flex items-center mb-6">
                {selectedUser.profileImage ? (
                  <img
                    src={selectedUser.profileImage}
                    alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                    className="h-16 w-16 rounded-full mr-4 object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                    <span className="text-gray-500 text-xl">
                      {selectedUser.firstName?.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="text-xl font-medium text-gray-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </h4>
                  <p className="text-gray-600">
                    User ID: {selectedUser.user_id}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Email
                  </h4>
                  <p className="text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Phone
                  </h4>
                  <p className="text-gray-900">
                    {selectedUser.phone || "Not provided"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Address
                  </h4>
                  <p className="text-gray-900">
                    {selectedUser.address || "Not provided"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    State
                  </h4>
                  <p className="text-gray-900">
                    {selectedUser.state || "Not provided"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Postal Code
                  </h4>
                  <p className="text-gray-900">
                    {selectedUser.postalcode || "Not provided"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">
                    Joined On
                  </h4>
                  <p className="text-gray-900">
                    {new Date(selectedUser.created_at).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-4 pt-4 border-t">
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    editUser(selectedUser);
                  }}
                >
                  <FiEdit className="mr-2" />
                  Edit User
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Edit User</h3>
              <IconButton
                onClick={() => setShowEditModal(false)}
                icon={<FiX />}
                variant="lightDanger"
              />
            </div>
            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    First Name
                  </label>
                  <FormInput
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Last Name
                  </label>
                  <FormInput
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <FormInput
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Phone
                  </label>
                  <FormInput
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label
                    htmlFor="is_approved"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Status
                  </label>
                  <FormSelect
                    id="is_approved"
                    name="is_approved"
                    value={formData.is_approved}
                    onChange={handleInputChange}
                    options={[
                      { value: 1, label: "Approved" },
                      { value: 0, label: "Suspended" },
                    ]}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
