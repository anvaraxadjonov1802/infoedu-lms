import React from 'react';
import { useLMS, PageView } from '../../context/LMSContext';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  page?: PageView;
  params?: Record<string, any>;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const { navigateTo } = useLMS();

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 flex-wrap">
      <button
        onClick={() => navigateTo('dashboard')}
        className="flex items-center gap-1 hover:text-blue-600 transition-colors font-medium"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Bosh sahifa</span>
      </button>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;

        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {isLast || !item.page ? (
              <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                {item.label}
              </span>
            ) : (
              <button
                onClick={() => navigateTo(item.page!, item.params)}
                className="hover:text-blue-600 transition-colors font-medium truncate max-w-[150px]"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
