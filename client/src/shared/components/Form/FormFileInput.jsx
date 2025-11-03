import { Upload, X } from 'lucide-react';
import React, { useState } from 'react';

const FormFileInput = ({
  label,
  name,
  accept,
  onChange,
  required = false,
  disabled = false,
  error,
  showPreview = false,
  className = '',
  ...rest
}) => {
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null);
  
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      
      if (showPreview && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
      
      if (onChange) {
        onChange(e);
      }
    }
  };
  
  const clearFile = () => {
    setFileName('');
    setPreview(null);
    
    // Reset the file input
    const fileInput = document.getElementById(name);
    if (fileInput) {
      fileInput.value = '';
    }
    
    if (onChange) {
      // Create a synthetic event
      const syntheticEvent = {
        target: {
          name,
          files: []
        }
      };
      onChange(syntheticEvent);
    }
  };
  
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label 
          htmlFor={name} 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      
      <div className="mt-1 flex items-center">
        <div className="flex-grow">
          <label 
            htmlFor={name}
            className={`
              relative flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-gray-50 cursor-pointer'}
              ${error ? 'border-error' : ''}
              text-sm font-medium text-gray-700
            `}
          >
            <Upload className="mr-2 h-5 w-5 text-gray-400" />
            <span>{fileName || 'Choose file...'}</span>
            <input
              id={name}
              name={name}
              type="file"
              accept={accept}
              onChange={handleChange}
              disabled={disabled}
              required={required}
              className="sr-only"
              {...rest}
            />
          </label>
        </div>
        
        {fileName && (
          <button
            type="button"
            onClick={clearFile}
            className="ml-2 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
      
      {showPreview && preview && (
        <div className="mt-2">
          <img 
            src={preview} 
            alt="Preview" 
            className="h-32 w-auto object-cover rounded-md" 
          />
        </div>
      )}
    </div>
  );
};

export default FormFileInput;