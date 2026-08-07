import React from 'react';

export const LoadingSkeleton: React.FC<{ type?: 'card' | 'table' | 'detail' }> = ({ type = 'card' }) => {
  if (type === 'table') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 animate-pulse">
        <div className="h-6 bg-slate-200 rounded-lg w-1/4 mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-slate-100 rounded-xl w-full" />
        ))}
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-slate-200 rounded-2xl w-full" />
        <div className="h-8 bg-slate-200 rounded-lg w-1/3" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-100 rounded-md w-full" />
          <div className="h-4 bg-slate-100 rounded-md w-5/6" />
          <div className="h-4 bg-slate-100 rounded-md w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-5 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-3">
          <div className="h-32 bg-slate-200 rounded-xl w-full" />
          <div className="h-5 bg-slate-200 rounded-md w-3/4" />
          <div className="h-3 bg-slate-100 rounded-md w-1/2" />
          <div className="h-2 bg-slate-100 rounded-full w-full" />
        </div>
      ))}
    </div>
  );
};
