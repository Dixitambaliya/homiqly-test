import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, LogOut, User } from 'lucide-react';

const HeaderMenu = ({ 
  userName, 
  userAvatar, 
  onLogout, 
  userRole = 'user',
  profilePath = '/profile',
  settingsPath = '/settings'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
      >
        {userAvatar ? (
          <img 
            src={userAvatar} 
            alt={userName} 
            className="h-8 w-8 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary-light/20 flex items-center justify-center text-primary-dark">
            {userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        )}
        <span className="font-medium hidden md:block">{userName}</span>
        <ArrowDown className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-100">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{userName}</p>
            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
          </div>
          
          <Link 
            to={profilePath}
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
          
          {/* <Link 
            to={settingsPath}
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            <FiSettings className="mr-2 h-4 w-4" />
            Settings
          </Link> */}
          
          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default HeaderMenu;