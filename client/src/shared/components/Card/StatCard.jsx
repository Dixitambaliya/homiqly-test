import React from 'react';

const StatCard = ({
  title,
  value,
  icon,
  change,
  changeType = 'neutral', // 'positive', 'negative', 'neutral'
  className = '',
  ...rest
}) => {
  const changeColors = {
    positive: 'text-success',
    negative: 'text-error',
    neutral: 'text-gray-500'
  };
  
  const changeIcon = {
    positive: '↑',
    negative: '↓',
    neutral: ''
  };
  
  return (
    <div 
      className={`bg-white rounded-lg shadow-sm p-6 ${className}`}
      {...rest}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          
          {change && (
            <p className={`mt-1 text-sm ${changeColors[changeType]}`}>
              {changeIcon[changeType]} {change}
            </p>
          )}
        </div>
        
        {icon && (
          <div className="p-3 rounded-full bg-primary-light/10 text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;