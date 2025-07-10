import React from 'react';

const ProgressBar = ({ current, total, label }) => {
  const percentage = (current / total) * 100;
  
  return (
    <div className="progress-bar-container">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      {label && (
        <div className="text-center mt-2">
          <span>{label}</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;