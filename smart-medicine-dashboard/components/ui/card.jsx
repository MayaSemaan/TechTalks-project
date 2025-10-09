'use client';

import React from 'react';

export function Card({ children, className = '' }) {
  return (
    <div
      className={`bg-white shadow-md rounded-2xl border border-gray-100 p-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, className = '' }) {
  return (
    <div className={`border-b pb-2 mb-3 text-lg font-semibold text-gray-800 ${className}`}>
      {title}
    </div>
  );
}

export function CardContent({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}