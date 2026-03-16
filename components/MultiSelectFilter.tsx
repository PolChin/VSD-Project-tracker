
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

interface MultiSelectFilterProps {
    label: string;
    options: string[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    className?: string;
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
    label,
    options,
    selectedValues,
    onChange,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (option: string) => {
        const newValues = selectedValues.includes(option)
            ? selectedValues.filter(v => v !== option)
            : [...selectedValues, option];
        onChange(newValues);
    };

    const selectAll = () => {
        onChange([...options]);
    };

    const clearAll = () => {
        onChange([]);
        setSearchTerm("");
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full h-8 px-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-800 transition-all shadow-sm group"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">
                        {label}:
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
                        {selectedValues.length === 0
                            ? "ALL"
                            : selectedValues.length === options.length
                                ? "ALL SELECTED"
                                : `${selectedValues.length} SELECTED`}
                    </span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-[300] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 min-w-[200px]">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder={`Search ${label}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={selectAll}
                                className="flex-1 py-1 px-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase rounded-lg border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                            >
                                Select All
                            </button>
                            <button
                                onClick={clearAll}
                                className="flex-1 py-1 px-2 bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[250px] overflow-y-auto p-1 custom-scrollbar">
                        {filteredOptions.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase italic">
                                No results found
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = selectedValues.includes(option);
                                return (
                                    <label
                                        key={option}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all group/item ${isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isSelected
                                                ? 'bg-indigo-500 border-indigo-500'
                                                : 'border-slate-200 dark:border-slate-600 group-hover/item:border-indigo-300 dark:group-hover/item:border-indigo-500'
                                            }`}>
                                            {isSelected && <Check size={10} className="text-white fill-white" />}
                                        </div>
                                        <span className={`text-[11px] font-bold transition-colors ${isSelected
                                                ? 'text-indigo-700 dark:text-indigo-300'
                                                : 'text-slate-600 dark:text-slate-400'
                                            }`}>
                                            {option}
                                        </span>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={() => toggleOption(option)}
                                        />
                                    </label>
                                );
                            })
                        )}
                    </div>

                    {selectedValues.length > 0 && (
                        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-2xl">
                            <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                                {selectedValues.length} items active
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MultiSelectFilter;
