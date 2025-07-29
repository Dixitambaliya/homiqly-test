import React from 'react';

const Card = ({ 
  children, 
  title, 
  subtitle,
  icon,
  actions,
  className = '',
  bodyClassName = '',
  noPadding = false,
  ...rest
}) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-sm overflow-hidden ${className}`}
      {...rest}
    >
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            {icon && <div className="mr-3">{icon}</div>}
            <div>
              {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      
      <div className={`${noPadding ? '' : 'p-6'} ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;