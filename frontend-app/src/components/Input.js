import React from 'react';

const Input = ({ value, onChange, placeholder, type = "text", className }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${className}`}
  />
);

export default Input;
