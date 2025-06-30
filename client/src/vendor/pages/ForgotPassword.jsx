import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiLoader } from 'react-icons/fi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { requestPasswordReset, verifyResetCode, resetPassword } = useVendorAuth();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await requestPasswordReset(email);
      
      if (result.success) {
        toast.success('Reset code sent to your email');
        setStep(2);
      } else {
        toast.error(result.error || 'Failed to send reset code');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Reset request error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!resetCode) {
      toast.error('Please enter the reset code');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await verifyResetCode(email, resetCode);
      
      if (result.success) {
        toast.success('Code verified successfully');
        setResetToken(result.token);
        setStep(3);
      } else {
        toast.error(result.error || 'Invalid code');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Code verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Please enter both password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await resetPassword(resetToken, newPassword);
      
      if (result.success) {
        toast.success('Password reset successfully');
        setStep(4);
      } else {
        toast.error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Reset Your Password</h2>
          <form onSubmit={handleRequestReset} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="vendor@example.com"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-dark to-primary hover:from-primary hover:to-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Code'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <Link to="/vendor/login" className="text-sm font-medium text-primary hover:text-primary-dark">
              Back to Login
            </Link>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Verify Reset Code</h2>
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label htmlFor="resetCode" className="block text-sm font-medium text-gray-700">
                Reset Code
              </label>
              <input
                id="resetCode"
                name="resetCode"
                type="text"
                required
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Enter the 6-digit code"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-dark to-primary hover:from-primary hover:to-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Set New Password</h2>
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-dark to-primary hover:from-primary hover:to-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 4 && (
        <div className="text-center">
          <div className="mb-6 text-green-500">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Password Reset Successful</h2>
          <p className="text-gray-600 mb-6">Your password has been reset successfully.</p>
          <Link
            to="/vendor/login"
            className="inline-block py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-dark to-primary hover:from-primary hover:to-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Back to Login
          </Link>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;