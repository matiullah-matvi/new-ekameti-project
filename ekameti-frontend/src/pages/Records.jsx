import React from 'react';
import NavBar from '../components/NavBar';

const Records = () => {
  return (
    <div className="page-container">
      <NavBar />
      <div className="page-content">
        <h2 className="text-2xl font-bold text-white text-center mt-10">📊 Records Page</h2>
        <p className="text-gray-400 text-center mt-4">Your transaction and activity records will appear here.</p>
      </div>
    </div>
  );
};

export default Records;
