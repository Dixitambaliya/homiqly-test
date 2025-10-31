import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import UsersTable from "../components/Tables/UsersTable"; // Adjust path as needed
import FormInput from "../../shared/components/Form/FormInput"; // Adjust path as needed
import { Button, IconButton } from "../../shared/components/Button";
import FormSelect from "../../shared/components/Form/FormSelect";
import Pagination from "../../shared/components/Pagination";
import UniversalDeleteModal from "../../shared/components/Modal/UniversalDeleteModal";
import Modal from "../../shared/components/Modal/Modal";
import { Edit, RefreshCcw, Search } from "lucide-react";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // modal / selected user state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // editing state inside the modal
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    is_approved: 1,
    address: "",
    state: "",
    postalcode: "",
    profileImage: "",
    created_at: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // minimal delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteAction, setDeleteAction] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null); // object for desc

  // Search + pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Debounce search input (500ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch((prev) => {
        // only set and reset page when actual change happens
        if (prev !== searchTerm.trim()) {
          setPage(1);
        }
        return searchTerm.trim();
      });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Fetch users from server (uses page, limit, debouncedSearch)
  const fetchUsers = useCallback(
    async (opts = {}) => {
      try {
        setLoading(true);
        setError(null);

        // allow overrides via opts (useful for Refresh button)
        const qPage = opts.page ?? page;
        const qLimit = opts.limit ?? limit;
        const qSearch = opts.search ?? debouncedSearch;

        const params = {
          page: qPage,
          limit: qLimit,
        };

        if (qSearch) params.search = qSearch;

        const response = await axios.get("/api/admin/getusers", { params });
        const data = response.data || {};

        // Try to read common shapes:
        // - users array might be under data.users or data.data
        // - pagination fields: count, limit, page, totalPages, totalUsers (per your sample)
        setUsers(data.users ?? data.data ?? []);
        setPage(data.page ?? qPage);
        setLimit(data.limit ?? qLimit);
        setTotalPages(data.totalPages ?? data.totalPages ?? 1);
        // some APIs use totalUsers or total
        setTotalUsers(data.totalUsers ?? data.total ?? data.count ?? 0);
      } catch (err) {
        console.error("Failed to load users", err);
        setError("Failed to load users");
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [page, limit, debouncedSearch]
  );

  // Initial fetch and whenever page/limit/debouncedSearch changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, page, limit, debouncedSearch]);

  useEffect(() => {
    if (selectedUser) {
      setFormData({
        firstName: selectedUser.firstName || "",
        lastName: selectedUser.lastName || "",
        email: selectedUser.email || "",
        phone: selectedUser.phone || "",
        is_approved: selectedUser.is_approved ?? 1,
        address: selectedUser.address || "",
        state: selectedUser.state || "",
        postalcode: selectedUser.postalcode || "",
        profileImage: selectedUser.profileImage || "",
        created_at: selectedUser.created_at || "",
      });
      setIsEditing(false); // always start in view mode
    }
  }, [selectedUser]);

  const openUserModal = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    if (submitting) return;
    setShowUserModal(false);
    setSelectedUser(null);
    setIsEditing(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // keep numeric-ish values as-is; convert to number where appropriate before submit if needed
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStartEdit = () => setIsEditing(true);

  const handleCancelEdit = () => {
    if (!selectedUser) return;
    setFormData({
      firstName: selectedUser.firstName || "",
      lastName: selectedUser.lastName || "",
      email: selectedUser.email || "",
      phone: selectedUser.phone || "",
      is_approved: selectedUser.is_approved ?? 1,
      address: selectedUser.address || "",
      state: selectedUser.state || "",
      postalcode: selectedUser.postalcode || "",
      profileImage: selectedUser.profileImage || "",
      created_at: selectedUser.created_at || "",
    });
    setIsEditing(false);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      const response = await axios.put(
        `/api/admin/editusers/${selectedUser.user_id}`,
        formData
      );
      if (response.status === 200) {
        toast.success("User updated successfully");
        setUsers((prev) =>
          prev.map((u) =>
            u.user_id === selectedUser.user_id ? { ...u, ...formData } : u
          )
        );
        setSelectedUser((prev) => ({ ...prev, ...formData }));
        setIsEditing(false);
      } else {
        toast.error("Failed to update user");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  // bind a delete action for a given user id and open modal
  const handleDeleteClick = (userId) => {
    // find user object for description (may be null)
    const user = users.find((u) => u.user_id === userId) || null;
    setDeletingUser(user);
    setShowDeleteModal(true);

    setDeleteAction(() => async () => {
      try {
        setDeleting(true);
        await axios.delete(`/api/admin/deleteusers/${userId}`);
        toast.success("User deleted successfully");
        setUsers((prev) => prev.filter((u) => u.user_id !== userId));
        // if the deleted user is currently open in the view modal, close it
        if (selectedUser?.user_id === userId) {
          setShowUserModal(false);
          setSelectedUser(null);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to delete user");
      } finally {
        setDeleting(false);
        setShowDeleteModal(false);
        setDeleteAction(null);
        setDeletingUser(null);
      }
    });
  };

  // NOTE: we now rely on server-side search/pagination; keep client-side filtering only for interim UX if desired.
  // Here, we show the server-provided users list and still allow local text filter on top if you prefer:
  const filteredUsers = useMemo(() => {
    const term = (debouncedSearch || "").trim().toLowerCase();
    // Because we're querying server with search, it's safe to return the server data directly.
    // However, keep this in case you want to further locally filter the single page.
    if (!term) return users;
    return users.filter((u) => {
      const first = (u.firstName || "").toLowerCase();
      const last = (u.lastName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return (
        first.includes(term) ||
        last.includes(term) ||
        email.includes(term) ||
        `${first} ${last}`.includes(term)
      );
    });
  }, [users, debouncedSearch]);

  // description for delete modal (safe-check)
  const deleteDesc = deletingUser
    ? `Are you sure you want to delete “${deletingUser.firstName} ${deletingUser.lastName}” (User ID: ${deletingUser.user_id})? This action cannot be undone.`
    : "Are you sure you want to delete this user?";

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          Admin User Management
        </h2>
        
        <div className="flex items-center space-x-2">
          <div className="hidden mr-2 text-sm text-gray-600 md:block">
            Page {page} of {totalPages}
          </div>

          <Button
            className="h-9"
            onClick={() => fetchUsers({ page: 1, limit })}
            variant="outline"
            icon={<RefreshCcw className="w-4 h-4 mr-2" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Search Controls */}
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center w-full gap-3 md:w-auto">
          <div className="flex-1 min-w-0 md:max-w-xs">
            <FormInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by first name, last name or email..."
              icon={<Search />}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="p-4 rounded-md bg-red-50">
          <p className="text-red-500">{error}</p>
        </div>
      ) : (
        <div className="overflow-hidden">
          <UsersTable
            users={filteredUsers}
            isLoading={loading}
            onEditUser={(user) => openUserModal(user)}
            onDelete={handleDeleteClick}
          />

          {/* Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 mt-4 sm:flex-row">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              disabled={loading}
              keepVisibleOnSinglePage={true}
              totalRecords={totalUsers}
              limit={limit}
              onLimitChange={(n) => { setLimit(n); setPage(1); }}
              renderLimitSelect={({ value, onChange, options }) => (
                <FormSelect
                  id="limit"
                  name="limit"
                  dropdownDirection="auto"
                  value={value}
                  onChange={(e) => onChange(Number(e.target.value))}
                  options={options.map((v) => ({ value: v, label: `${v} / page` }))}
                />
              )}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </div>
        </div>
      )}

      {/* Combined View/Edit User Modal */}
      {showUserModal && selectedUser && (
        <Modal
          isOpen={showUserModal}
          onClose={closeUserModal}
          title={isEditing ? "Edit User" : "User Details"}
        >
          <>
            <div className="h-auto p-4 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center mb-6">
                  {formData.profileImage ? (
                    <img
                      src={formData.profileImage}
                      alt={`${formData.firstName} ${formData.lastName}`}
                      className="object-cover w-16 h-16 mr-4 rounded-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-16 h-16 mr-4 bg-gray-200 rounded-full">
                      <span className="text-xl text-gray-500">
                        {formData.firstName?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xl font-medium text-gray-900">
                      {formData.firstName} {formData.lastName}
                    </h4>
                    <p className="text-gray-600">
                      User ID: {selectedUser.user_id}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormInput
                    label="First Name"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />

                  <FormInput
                    label="Last Name"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />

                  <FormInput
                    label="Email"
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />

                  <FormInput
                    label="Phone"
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />

                  <FormInput
                    label="Address"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />

                  <FormInput
                    label="State"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />

                  <FormInput
                    label="Postal Code"
                    id="postalcode"
                    name="postalcode"
                    value={formData.postalcode}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
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
                      disabled={!isEditing}
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Joined On
                    </label>
                    <p className="text-gray-900">
                      {formData.created_at
                        ? new Date(formData.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : "-"}
                    </p>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer - always visible */}
            <div className="sticky bottom-0 flex justify-end gap-3 p-4 bg-white border-t">
              {!isEditing ? (
                <>
                  <Button
                    onClick={() => handleDeleteClick(selectedUser.user_id)}
                    variant="lightError"
                  >
                    Delete
                  </Button>

                  <Button
                    onClick={handleStartEdit}
                    variant="ghost"
                    className="flex items-center"
                  >
                    <Edit className="mr-2" />
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    isLoading={submitting}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </>
        </Modal>
      )}

      <UniversalDeleteModal
        open={showDeleteModal}
        onClose={() => {
          if (!deleting) {
            setShowDeleteModal(false);
            setDeleteAction(null);
            setDeletingUser(null);
          }
        }}
        onDelete={deleteAction}
        confirmLabel="Remove user"
        cancelLabel="Keep user"
        onError={(err) => toast.error(err.message || "Delete failed")}
        title="Delete User"
        desc={deleteDesc}
      />
    </div>
  );
};

export default Users;