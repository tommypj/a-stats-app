import React from 'react';

const Card = ({ className, children }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-xl ${className}`}>
    {children}
  </div>
);

export default Card;
