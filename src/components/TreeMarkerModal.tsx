'use client';

import { useState, useEffect, useRef } from 'react';
import ScientificTreeSearch from './ScientificTreeSearch';

interface TreeMarkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nickname: string, description: string, scientificTreeId: string | null) => Promise<void>;
  latitude: number;
  longitude: number;
  mapRef?: any;
}

export default function TreeMarkerModal({
  isOpen,
  onClose,
  onSave,
  latitude,
  longitude,
  mapRef,
}: TreeMarkerModalProps) {
  const [nickname, setNickname] = useState('');
  const [description, setDescription] = useState('');
  const [scientificTreeId, setScientificTreeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalPosition, setModalPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    arrowPosition?: 'top' | 'bottom' | 'left' | 'right';
    arrowOffset?: number; // Offset in pixels from the edge
  }>({});
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !mapRef?.current) return;

    const updatePosition = () => {
      try {
        const map = mapRef.current?.getMap();
        if (!map) return;

        const point = map.project([longitude, latitude]);
        const container = map.getContainer();
        const containerRect = container.getBoundingClientRect();
        const x = containerRect.left + point.x;
        const y = containerRect.top + point.y;

        const modalWidth = 448;
        const modalHeight = 400;
        const padding = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let position: {
          top?: number;
          bottom?: number;
          left?: number;
          right?: number;
          arrowPosition?: 'top' | 'bottom' | 'left' | 'right';
          arrowOffset?: number;
        } = {};

        let modalLeft = x + 10;
        let modalTop = y + 30;
        let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';
        let arrowOffset = x - modalLeft;

        if (y + modalHeight + padding < viewportHeight && x + modalWidth + padding < viewportWidth) {
          modalTop = y + 30;
          arrowPosition = 'top';
        } else if (y - modalHeight - padding > 0) {
          modalTop = y - modalHeight - 30;
          arrowPosition = 'bottom';
        } else {
          modalTop = Math.max(padding, Math.min(y - modalHeight / 2, viewportHeight - modalHeight - padding));
          arrowPosition = y < viewportHeight / 2 ? 'top' : 'bottom';
        }

        modalLeft = Math.max(padding, Math.min(modalLeft, viewportWidth - modalWidth - padding));
        arrowOffset = Math.max(24, Math.min(x - modalLeft, modalWidth - 24));

        if (modalTop + modalHeight > viewportHeight - padding) {
          modalTop = viewportHeight - modalHeight - padding;
        }
        if (modalTop < padding) {
          modalTop = padding;
        }

        position = {
          top: modalTop,
          left: modalLeft,
          arrowPosition,
          arrowOffset,
        };

        setModalPosition(position);
      } catch (err) {
        setModalPosition({});
      }
    };

    updatePosition();
    const map = mapRef.current?.getMap();
    if (map) {
      map.on('move', updatePosition);
      map.on('zoom', updatePosition);
      window.addEventListener('resize', updatePosition);
      return () => {
        map.off('move', updatePosition);
        map.off('zoom', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, mapRef, latitude, longitude]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!nickname.trim()) {
      setError('Tree nickname is required');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onSave(nickname.trim(), description.trim(), scientificTreeId);
      setNickname('');
      setDescription('');
      setScientificTreeId(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save tree marker');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNickname('');
    setDescription('');
    setScientificTreeId(null);
    setError('');
    onClose();
  };

  const Arrow = ({ position, offset }: { position?: string; offset?: number }) => {
    if (!position) return null;

    const baseClasses = 'absolute w-0 h-0';
    const arrowStyles: Record<string, { className: string; style: React.CSSProperties }> = {
      top: {
        className: `${baseClasses} -top-2 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white`,
        style: { left: offset ? `${offset}px` : '32px', transform: 'translateX(-50%)' },
      },
      bottom: {
        className: `${baseClasses} -bottom-2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white`,
        style: { left: offset ? `${offset}px` : '32px', transform: 'translateX(-50%)' },
      },
      left: {
        className: `${baseClasses} left-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white`,
        style: { top: offset ? `${offset}px` : '32px', transform: 'translateY(-50%)' },
      },
      right: {
        className: `${baseClasses} right-0 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-white`,
        style: { top: offset ? `${offset}px` : '32px', transform: 'translateY(-50%)' },
      },
    };

    const arrowConfig = arrowStyles[position];
    if (!arrowConfig) return null;

    return <div className={arrowConfig.className} style={arrowConfig.style} />;
  };

  const hasCustomPosition = modalPosition.top !== undefined || modalPosition.bottom !== undefined;

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div
        ref={modalRef}
        className={`bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative ${
          hasCustomPosition ? 'absolute' : 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
        }`}
        style={
          hasCustomPosition
            ? {
                top: modalPosition.top !== undefined ? `${modalPosition.top}px` : undefined,
                bottom: modalPosition.bottom !== undefined ? `${modalPosition.bottom}px` : undefined,
                left: modalPosition.left !== undefined ? `${modalPosition.left}px` : undefined,
                right: modalPosition.right !== undefined ? `${modalPosition.right}px` : undefined,
              }
            : {}
        }
        onClick={(e) => e.stopPropagation()}
      >
        <Arrow position={modalPosition.arrowPosition} offset={modalPosition.arrowOffset} />
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Add Tree Marker</h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tree Nickname <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g., My Favorite Oak, The Big Maple"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={loading}
            />
          </div>

          <ScientificTreeSearch
            value={scientificTreeId}
            onChange={setScientificTreeId}
            disabled={loading}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this tree..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              disabled={loading}
            />
          </div>

          <div className="text-xs text-gray-500">
            Location: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !nickname.trim()}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

