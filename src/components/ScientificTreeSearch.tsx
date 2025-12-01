'use client';

import { useState, useEffect, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ScientificTree {
  id: string;
  scientific_name: string;
  common_name?: string;
  family?: string;
  genus?: string;
  images?: string[];
  countries?: string[];
  description?: string;
}

interface ScientificTreeSearchProps {
  value: string | null;
  onChange: (scientificTreeId: string | null) => void;
  disabled?: boolean;
}

export default function ScientificTreeSearch({
  value,
  onChange,
  disabled = false,
}: ScientificTreeSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ScientificTree[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTree, setSelectedTree] = useState<ScientificTree | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && value !== selectedTree?.id) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(value)) {
        fetch(`${API_URL}/scientific-trees/${value}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.id) {
              setSelectedTree(data);
              setSearchQuery(
                data.common_name
                  ? `${data.common_name} (${data.scientific_name})`
                  : data.scientific_name,
              );
            }
          })
          .catch(() => {
            // Silently fail
          });
      } else if (value === selectedTree?.id) {
        return;
      }
    } else if (!value && selectedTree) {
      setSelectedTree(null);
      setSearchQuery('');
    }
  }, [value, selectedTree]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchScientificTrees = async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/scientific-trees/search?q=${encodeURIComponent(query)}&limit=10`,
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        setResults([]);
      }
    } catch (error) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (query.trim()) {
        searchScientificTrees(query);
      } else {
        setResults([]);
      }
    }, 300);
  };

  const handleSelect = (tree: ScientificTree) => {
    setSelectedTree(tree);
    setSearchQuery(
      tree.common_name
        ? `${tree.common_name} (${tree.scientific_name})`
        : tree.scientific_name,
    );
    onChange(tree.id);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedTree(null);
    setSearchQuery('');
    onChange(null);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (selectedTree) {
      const currentDisplayText = selectedTree.common_name
        ? `${selectedTree.common_name} (${selectedTree.scientific_name})`
        : selectedTree.scientific_name;

      if (query !== currentDisplayText) {
        setSelectedTree(null);
        onChange(null);
      }
    }

    if (!query.trim() && selectedTree) {
      setSelectedTree(null);
      onChange(null);
    }

    setIsOpen(true);
    handleSearchChange(e);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Scientific Name (Optional)
      </label>
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search by common or scientific name..."
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        />
        {selectedTree && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (results.length > 0 || loading) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
          ) : (
            results.map((tree) => (
              <button
                key={tree.id}
                type="button"
                onClick={() => handleSelect(tree)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0 flex gap-3 items-start"
              >
                {tree.images && tree.images.length > 0 && (
                  <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-gray-200">
                    <img
                      src={tree.images[0]}
                      alt={tree.common_name || tree.scientific_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {tree.common_name ? (
                    <>
                      <div className="font-semibold text-gray-900">
                        {tree.common_name}
                      </div>
                      <div className="text-sm text-gray-600 italic">
                        {tree.scientific_name}
                      </div>
                      {(tree.family || tree.genus) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {tree.genus && <span>{tree.genus}</span>}
                          {tree.genus && tree.family && <span> • </span>}
                          {tree.family && <span>{tree.family} family</span>}
                        </div>
                      )}
                      {tree.countries && tree.countries.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          Found in: {tree.countries.slice(0, 3).join(', ')}
                          {tree.countries.length > 3 && '...'}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="font-medium text-gray-900 italic">
                        {tree.scientific_name}
                      </div>
                      {(tree.family || tree.genus) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {tree.genus && <span>{tree.genus}</span>}
                          {tree.genus && tree.family && <span> • </span>}
                          {tree.family && <span>{tree.family} family</span>}
                        </div>
                      )}
                      {tree.countries && tree.countries.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          Found in: {tree.countries.slice(0, 3).join(', ')}
                          {tree.countries.length > 3 && '...'}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

