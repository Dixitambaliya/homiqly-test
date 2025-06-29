import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiEye, FiX, FiEdit, FiList } from 'react-icons/fi';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    employee_type: 'full_time',
    department: '',
    position: '',
    salary: '',
    manager_id: ''
  });
  const [taskFormData, setTaskFormData] = useState({
    task_title: '',
    task_description: '',
    priority: 'medium',
    due_date: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/employee/all');
      setEmployees(response.data.employees || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to load employees');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.department || !formData.position) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await axios.post('/api/employee/create', formData);
      
      if (response.status === 201) {
        toast.success('Employee created successfully');
        setShowAddModal(false);
        resetForm();
        fetchEmployees(); // Refresh the list
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error(error.response?.data?.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    
    if (!taskFormData.task_title || !taskFormData.priority || !taskFormData.due_date) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await axios.post('/api/employee/assign-task', {
        employee_id: selectedEmployee.employee_id,
        ...taskFormData
      });
      
      if (response.status === 201) {
        toast.success('Task assigned successfully');
        setShowTasksModal(false);
        setTaskFormData({
          task_title: '',
          task_description: '',
          priority: 'medium',
          due_date: ''
        });
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      toast.error(error.response?.data?.message || 'Failed to assign task');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      employee_type: 'full_time',
      department: '',
      position: '',
      salary: '',
      manager_id: ''
    });
  };

  const viewEmployeeDetails = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const showAssignTaskModal = (employee) => {
    setSelectedEmployee(employee);
    setShowTasksModal(true);
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
        <h2 className="text-2xl font-bold text-gray-800">Employee Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark flex items-center"
        >
          <FiPlus className="mr-2" />
          Add Employee
        </button>
      </div>

      {employees.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map(employee => (
                  <tr key={employee.employee_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.employee_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.position}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {employee.employee_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewEmployeeDetails(employee)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        <FiEye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => showAssignTaskModal(employee)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <FiList className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No employees found.</p>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Add New Employee</h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
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
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name*
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name*
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email*
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="employee_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Type*
                  </label>
                  <select
                    id="employee_type"
                    name="employee_type"
                    value={formData.employee_type}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department*
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                    Position*
                  </label>
                  <input
                    type="text"
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-1">
                    Salary
                  </label>
                  <input
                    type="number"
                    id="salary"
                    name="salary"
                    value={formData.salary}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="manager_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Manager
                  </label>
                  <select
                    id="manager_id"
                    name="manager_id"
                    value={formData.manager_id}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  >
                    <option value="">No Manager</option>
                    {employees.map(employee => (
                      <option key={employee.employee_id} value={employee.employee_id}>
                        {employee.first_name} {employee.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
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
                      <span className="ml-2">Creating...</span>
                    </>
                  ) : (
                    'Create Employee'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {showDetailsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Employee Details</h3>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Employee ID</h4>
                  <p className="text-gray-900">#{selectedEmployee.employee_id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedEmployee.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedEmployee.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Full Name</h4>
                  <p className="text-gray-900">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                  <p className="text-gray-900">{selectedEmployee.email}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Phone</h4>
                  <p className="text-gray-900">{selectedEmployee.phone || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Employee Type</h4>
                  <p className="text-gray-900 capitalize">{selectedEmployee.employee_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Department</h4>
                  <p className="text-gray-900">{selectedEmployee.department}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Position</h4>
                  <p className="text-gray-900">{selectedEmployee.position}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Salary</h4>
                  <p className="text-gray-900">₹{selectedEmployee.salary || 'Not specified'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Hire Date</h4>
                  <p className="text-gray-900">
                    {new Date(selectedEmployee.hire_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Manager</h4>
                  <p className="text-gray-900">{selectedEmployee.manager_name || 'None'}</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    showAssignTaskModal(selectedEmployee);
                  }}
                  className="px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark flex items-center"
                >
                  <FiList className="mr-2" />
                  Assign Task
                </button>
                <button
                  onClick={() => {
                    // Edit employee functionality would go here
                    toast.info('Edit functionality coming soon');
                  }}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center"
                >
                  <FiEdit className="mr-2" />
                  Edit Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showTasksModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Assign Task to {selectedEmployee.first_name}</h3>
              <button 
                onClick={() => setShowTasksModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAssignTask} className="p-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="task_title" className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title*
                  </label>
                  <input
                    type="text"
                    id="task_title"
                    name="task_title"
                    value={taskFormData.task_title}
                    onChange={handleTaskInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="task_description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="task_description"
                    name="task_description"
                    value={taskFormData.task_description}
                    onChange={handleTaskInputChange}
                    rows="3"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                    Priority*
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={taskFormData.priority}
                    onChange={handleTaskInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date*
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    name="due_date"
                    value={taskFormData.due_date}
                    onChange={handleTaskInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTasksModal(false)}
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
                      <span className="ml-2">Assigning...</span>
                    </>
                  ) : (
                    'Assign Task'
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

export default Employees;