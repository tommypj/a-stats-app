import React from 'react';

const Button = ({ onClick, disabled, className, children }) => (
  <button onClick={onClick} disabled={disabled} className={`p-3 rounded-xl shadow-md text-white font-bold transition-all duration-200 ${disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} ${className}`}>
    {children}
  </button>
);

export default Button;
