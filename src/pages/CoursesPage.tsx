import React, { useState } from 'react';
import { useLMS } from '../context/LMSContext';
import { CourseCard } from '../components/courses/CourseCard';
import { EmptyState } from '../components/common/EmptyState';
import { Search, Filter, LayoutGrid, List, SlidersHorizontal, BookOpen } from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const { courses } = useLMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'progress' | 'last_accessed'>('last_accessed');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = ['all', 'Dasturlash', 'Ma’lumotlar bazasi', 'Web-dasturlash', 'Tarmoqlar'];

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'progress') return b.progressPercentage - a.progressPercentage;
    return new Date(b.lastAccessedDate).getTime() - new Date(a.lastAccessedDate).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kurs nomi, kod yoki kalit so‘zlardan qidiring..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Sort & Layout Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Sort selector */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="last_accessed">So‘nggi kirilgan</option>
                <option value="progress">O‘zlashtirish %</option>
                <option value="title">Nomi bo‘yicha</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-500'
                }`}
                title="Setka ko‘rinishi"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-500'
                }`}
                title="Ro‘yxat ko‘rinishi"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Categories Chips & Status Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'Barcha Sohalar' : cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            <span className="font-semibold text-slate-400">Holat:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-1 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">Barchasi</option>
              <option value="in_progress">Jarayonda</option>
              <option value="completed">Tugallangan</option>
              <option value="not_started">Boshlanmagan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Course Cards Container */}
      {sortedCourses.length === 0 ? (
        <EmptyState
          title="Kurslar topilmadi"
          description="Tanlangan filtrlar bo‘yicha hech qanday fan yoki kurs topilmadi. Qidiruv so‘rovini o‘zgartirib ko‘ring."
          actionLabel="Filtrlarni tozalash"
          onAction={() => {
            setSearchQuery('');
            setSelectedCategory('all');
            setSelectedStatus('all');
          }}
          icon={BookOpen}
        />
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }
        >
          {sortedCourses.map((c) => (
            <CourseCard key={c.id} course={c} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  );
};
