import React from 'react';

const Alert = ({ type, onClose, className, children }) => {
  const colorClasses = type === 'error' ? 'bg-red-100 text-red-700 border-red-400' : 'bg-green-100 text-green-700 border-green-400';
  return (
    <div className={`p-4 rounded-xl border ${colorClasses} flex items-center justify-between ${className}`}>
      <p>{children}</p>
      {onClose && <button onClick={onClose} className="ml-4 font-bold">×</button>}
    </div>
  );
};

export default Alert;
