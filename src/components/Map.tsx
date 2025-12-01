'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker, ViewState, MapRef } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import TreeMarkerModal from './TreeMarkerModal';
import TreeDetailsModal from './TreeDetailsModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ScientificTree {
  id: string;
  scientific_name: string;
  common_name?: string;
}

interface Tree {
  id: string;
  nickname: string;
  description?: string;
  latitude: number;
  longitude: number;
  user_id: string;
  scientific_tree_id?: string | null;
  scientific_tree?: ScientificTree;
  created_at: string;
  updated_at: string;
}

const CHATTANOOGA_CENTER = {
  longitude: -85.3097,
  latitude: 35.0456,
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const INITIAL_VIEWSTATE: ViewState = {
  ...CHATTANOOGA_CENTER,
  zoom: 12,
  pitch: 0,
  bearing: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};

const BASEMAPS = [
  {
    id: 'dark-matter',
    name: 'Dark Matter',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  {
    id: 'positron',
    name: 'Positron',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  {
    id: 'voyager',
    name: 'Voyager',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
  {
    id: 'outdoors',
    name: 'Outdoors',
    url: 'https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json',
  },
];

export default function TreeMap() {
  const { user, token, login, register, logout } = useAuth();
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEWSTATE);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentBasemap, setCurrentBasemap] = useState(BASEMAPS[0]);
  const [showBasemapMenu, setShowBasemapMenu] = useState(false);
  const mapRef = useRef<MapRef>(null);
  const [addressSearch, setAddressSearch] = useState('');
  const [addressResults, setAddressResults] = useState<Array<{
    display_name: string;
    full_address?: string;
    lat: number;
    lon: number;
  }>>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        showBasemapMenu &&
        !target.closest('.basemap-switcher-container')
      ) {
        setShowBasemapMenu(false);
      }
      if (
        showAddressDropdown &&
        !target.closest('.address-search-container')
      ) {
        setShowAddressDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBasemapMenu, showAddressDropdown]);

  const searchAddress = useCallback(async (query: string) => {
    if (!query || query.trim().length < 3) {
      setAddressResults([]);
      setShowAddressDropdown(false);
      return;
    }

    setSearchingAddress(true);
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?` +
        `q=${encodeURIComponent(query)}&` +
        `lat=${CHATTANOOGA_CENTER.latitude}&` +
        `lon=${CHATTANOOGA_CENTER.longitude}&` +
        `limit=10`
      );

      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const filteredResults = (data.features || [])
        .map((feature: any) => {
          const [lon, lat] = feature.geometry.coordinates;
          const properties = feature.properties || {};
          const addressParts: string[] = [];
          
          if (properties.housenumber && properties.street) {
            addressParts.push(`${properties.housenumber} ${properties.street}`);
          } else if (properties.street) {
            addressParts.push(properties.street);
          } else if (properties.name) {
            addressParts.push(properties.name);
          }
          
          if (properties.city) {
            addressParts.push(properties.city);
          }
          
          if (properties.state) {
            addressParts.push(properties.state);
          }
          
          if (properties.postcode) {
            addressParts.push(properties.postcode);
          }
          
          const fullAddress = addressParts.length > 0 
            ? addressParts.join(', ')
            : properties.name || properties.display_name || 'Address';

          return {
            display_name: fullAddress,
            lat: lat,
            lon: lon,
            full_address: fullAddress,
          };
        })
        .filter((item: { lat: number; lon: number }) => {
          const distance = calculateDistance(
            CHATTANOOGA_CENTER.latitude,
            CHATTANOOGA_CENTER.longitude,
            item.lat,
            item.lon
          );
          return distance <= 15;
        });

      setAddressResults(filteredResults);
      setShowAddressDropdown(filteredResults.length > 0);
    } catch (error) {
      setAddressResults([]);
      setShowAddressDropdown(false);
    } finally {
      setSearchingAddress(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchAddress(addressSearch);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [addressSearch, searchAddress]);

  const handleAddressSelect = (result: { display_name: string; full_address?: string; lat: number; lon: number }) => {
    setAddressSearch(result.full_address || result.display_name);
    setShowAddressDropdown(false);
    setAddressResults([]);

    setViewState({
      ...viewState,
      longitude: result.lon,
      latitude: result.lat,
      zoom: 15,
    });
  };

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    try {
      const response = await fetch(`${API_URL}/trees`);
      if (response.ok) {
        const data = await response.json();
        setTrees(data);
      }
    } catch (error) {
      // Silently fail - trees will just not be displayed
    }
  };

  const checkForDuplicateTree = (latitude: number, longitude: number): Tree | null => {
    const THRESHOLD = 0.0001;
    return (
      trees.find(
        (tree) =>
          Math.abs(tree.latitude - latitude) < THRESHOLD &&
          Math.abs(tree.longitude - longitude) < THRESHOLD,
      ) || null
    );
  };

  const handleMapClick = (event: any) => {
    if (event.originalEvent?.target?.closest('.marker-container')) {
      return;
    }

    if (!user) {
      setShowLogin(true);
      return;
    }

    const { lngLat } = event;
    const existingTree = checkForDuplicateTree(lngLat.lat, lngLat.lng);
    if (existingTree) {
      setSelectedTree(existingTree);
      setShowDetailsModal(true);
      return;
    }

    setSelectedLocation({
      latitude: lngLat.lat,
      longitude: lngLat.lng,
    });
    setShowTreeModal(true);
  };

  const handleMarkerClick = (tree: Tree, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedTree(tree);
    setShowDetailsModal(true);
  };

  const handleSaveTree = async (nickname: string, description: string, scientificTreeId: string | null) => {
    if (!selectedLocation || !token) {
      throw new Error('Missing location or authentication');
    }

    // Double-check for duplicate before saving
    const existingTree = checkForDuplicateTree(
      selectedLocation.latitude,
      selectedLocation.longitude,
    );
    if (existingTree) {
      throw new Error('A tree marker already exists at this location');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/trees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nickname,
          description,
          scientific_tree_id: scientificTreeId,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save tree');
      }

      await fetchTrees();

      setViewState({
        ...viewState,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        zoom: 15,
      });

      setShowTreeModal(false);
      setSelectedLocation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTree = async (id: string, nickname: string, description: string, scientificTreeId: string | null) => {
    if (!token) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/trees/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nickname,
          description,
          scientific_tree_id: scientificTreeId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update tree');
      }

      // Refresh trees list
      await fetchTrees();

      // Update selected tree
      const updatedTree = await response.json();
      setSelectedTree(updatedTree);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTree = async (id: string) => {
    if (!token) {
      throw new Error('Authentication required');
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/trees/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete tree');
      }

      // Refresh trees list
      await fetchTrees();

      // Close modal
      setShowDetailsModal(false);
      setSelectedTree(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen relative">
      <Map
        {...viewState}
        ref={mapRef}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
        mapStyle={currentBasemap.url}
        attributionControl={true}
      >
        {trees.map((tree) => (
          <Marker
            key={tree.id}
            longitude={tree.longitude}
            latitude={tree.latitude}
            anchor="bottom"
          >
            <div
              className={`marker-container cursor-pointer transition-all duration-200 hover:scale-125 hover:drop-shadow-lg hover:z-50 group ${
                selectedTree?.id === tree.id ? 'scale-125 drop-shadow-lg z-50' : ''
              }`}
              onClick={(e) => handleMarkerClick(tree, e)}
              title={tree.nickname}
            >
              <svg
                width="30"
                height="40"
                viewBox="0 0 30 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transition-all duration-200"
              >
                <path
                  d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 25 15 25s15-13.75 15-25c0-8.284-6.716-15-15-15z"
                  fill={selectedTree?.id === tree.id ? '#16a34a' : '#22c55e'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className={`group-hover:fill-green-600 group-hover:drop-shadow-md ${
                    selectedTree?.id === tree.id ? 'drop-shadow-md' : ''
                  }`}
                />
                <circle cx="15" cy="15" r="5" fill="#ffffff" />
              </svg>
            </div>
          </Marker>
        ))}
      </Map>
      
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10 max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Chattanooga Trees</h1>
        <p className="text-sm text-gray-600 mb-3">Click on the map to add a tree marker</p>
        
        <div className="mb-3 address-search-container relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Address
          </label>
          <div className="relative">
            <input
              type="text"
              value={addressSearch}
              onChange={(e) => {
                setAddressSearch(e.target.value);
                if (e.target.value.length >= 3) {
                  setShowAddressDropdown(true);
                }
              }}
              onFocus={() => {
                if (addressResults.length > 0) {
                  setShowAddressDropdown(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              placeholder="Enter an address..."
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
            {searchingAddress && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
              </div>
            )}
          </div>
          
          {showAddressDropdown && addressResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {addressResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleAddressSelect(result)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 text-sm"
                >
                  <div className="font-medium text-gray-800">
                    {result.full_address || result.display_name}
                  </div>
                </button>
              ))}
            </div>
          )}
          {showAddressDropdown && addressSearch.length >= 3 && addressResults.length === 0 && !searchingAddress && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-sm text-gray-500">
              No addresses found within 15 miles of Chattanooga
            </div>
          )}
        </div>
        
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">Welcome, {user.fullName || user.email}!</span>
            <button
              onClick={logout}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowLogin(true)}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Login
            </button>
            <button
              onClick={() => setShowRegister(true)}
              className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Register
            </button>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 z-10 basemap-switcher-container">
        <div className="relative">
          <button
            onClick={() => setShowBasemapMenu(!showBasemapMenu)}
            className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white flex items-center gap-2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 0L0 4V8C0 11.314 2.686 14 6 14C7.657 14 9.157 13.314 10.243 12.243L16 8V4L8 0Z"
                fill="currentColor"
              />
            </svg>
            {currentBasemap.name}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transform transition-transform ${
                showBasemapMenu ? 'rotate-180' : ''
              }`}
            >
              <path
                d="M6 9L1 4H11L6 9Z"
                fill="currentColor"
              />
            </svg>
          </button>

          {showBasemapMenu && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg overflow-hidden min-w-[180px]">
              {BASEMAPS.map((basemap) => (
                <button
                  key={basemap.id}
                  onClick={() => {
                    setCurrentBasemap(basemap);
                    setShowBasemapMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                    currentBasemap.id === basemap.id
                      ? 'bg-green-50 text-green-700 font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  {basemap.name}
                  {currentBasemap.id === basemap.id && (
                    <span className="ml-2 text-green-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={() => {
          setShowLogin(false);
          setShowRegister(true);
        }}
        onLogin={login}
      />

      <RegisterModal
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onSwitchToLogin={() => {
          setShowRegister(false);
          setShowLogin(true);
        }}
        onRegister={register}
      />

      {selectedLocation && (
        <TreeMarkerModal
          isOpen={showTreeModal}
          onClose={() => {
            setShowTreeModal(false);
            setSelectedLocation(null);
          }}
          onSave={handleSaveTree}
          latitude={selectedLocation.latitude}
          longitude={selectedLocation.longitude}
          mapRef={mapRef}
        />
      )}

      {selectedTree && (
        <TreeDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTree(null);
          }}
          tree={selectedTree}
          isOwner={user?.id === selectedTree.user_id}
          onEdit={handleEditTree}
          onDelete={handleDeleteTree}
          mapRef={mapRef}
        />
      )}
    </div>
  );
}

