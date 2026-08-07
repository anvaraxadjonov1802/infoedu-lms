import React, { useState } from 'react';
import { useLMS } from '../context/LMSContext';
import { Test } from '../types/lms';
import { TestCard } from '../components/test/TestCard';
import { EmptyState } from '../components/common/EmptyState';
import { Search, FileQuestion, Filter } from 'lucide-react';

export const TestsPage: React.FC = () => {
  const { tests } = useLMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const testList = Object.values(tests) as Test[];

  const filteredTests = testList.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.courseName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Test nomi yoki fan bo‘yicha izlang..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-400">Holat bo‘yicha:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">Barchasi</option>
            <option value="passed">Topshirildi (Muvaffaqiyatli)</option>
            <option value="retake_needed font-bold text-rose-600">Qayta topshirish kerak</option>
            <option value="not_started">Boshlanmagan</option>
          </select>
        </div>
      </div>

      {/* Test Catalog Cards Grid */}
      {filteredTests.length === 0 ? (
        <EmptyState
          title="Testlar topilmadi"
          description="Tanlangan mezonlar bo‘yicha hech qanday test topilmadi."
          actionLabel="Filtrni tozalash"
          onAction={() => {
            setSearchQuery('');
            setSelectedStatus('all');
          }}
          icon={FileQuestion}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((t) => (
            <TestCard key={t.id} test={t} />
          ))}
        </div>
      )}
    </div>
  );
};
