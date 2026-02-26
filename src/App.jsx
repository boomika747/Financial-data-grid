import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './App.css';

const ROW_HEIGHT = 40;
const BUFFER_SIZE = 10; // Number of rows to render above and below visible area

const COLUMNS = [
  { key: 'id', label: 'ID', width: 80 },
  { key: 'date', label: 'Date', width: 200 },
  { key: 'merchant', label: 'Merchant', width: 200 },
  { key: 'category', label: 'Category', width: 150 },
  { key: 'amount', label: 'Amount', width: 120 },
  { key: 'status', label: 'Status', width: 120 },
  { key: 'description', label: 'Description', width: 300 },
];

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function useFPS() {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animationFrameId;

    const measureFPS = () => {
      const now = performance.now();
      frameCount.current += 1;

      if (now - lastTime.current >= 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastTime.current = now;
      }

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return fps;
}

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Virtualization state
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const viewportRef = useRef(null);

  // Feature states
  const [merchantFilter, setMerchantFilter] = useState('');
  const debouncedMerchantFilter = useDebounce(merchantFilter, 300);

  const [statusFilter, setStatusFilter] = useState('');

  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const [selectedIds, setSelectedIds] = useState(new Set());

  const [pinnedColumns, setPinnedColumns] = useState(new Set());

  const [editingCell, setEditingCell] = useState(null); // { id, key }
  const [editValue, setEditValue] = useState('');

  const fps = useFPS();

  useEffect(() => {
    fetch('/transactions.json')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch data', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (viewportRef.current) {
      setViewportHeight(viewportRef.current.clientHeight);
    }
    const handleResize = () => {
      if (viewportRef.current) {
        setViewportHeight(viewportRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [loading]);

  const handleScroll = useCallback((e) => {
    const targetScrollTop = e.target.scrollTop;
    requestAnimationFrame(() => {
      setScrollTop(targetScrollTop);
    });
  }, []);

  // Process data (Filter and Sort)
  const processedData = useMemo(() => {
    let filtered = data;

    if (debouncedMerchantFilter) {
      const lowerFilter = debouncedMerchantFilter.toLowerCase();
      filtered = filtered.filter(row => row.merchant.toLowerCase().includes(lowerFilter));
    }

    if (statusFilter) {
      filtered = filtered.filter(row => row.status === statusFilter);
    }

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, debouncedMerchantFilter, statusFilter, sortConfig]);

  // Update original data when edited
  const handleEditSave = useCallback((id, key, newValue) => {
    setData(prevData => prevData.map(row => {
      if (row.id === id) {
        return { ...row, [key]: newValue };
      }
      return row;
    }));
    setEditingCell(null);
  }, []);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
      key = null;
    }
    setSortConfig({ key, direction });
  };

  const togglePin = (e, key) => {
    e.stopPropagation();
    setPinnedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleRowClick = (e, id) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    } else {
      setSelectedIds(new Set([id]));
    }
  };

  const totalHeight = processedData.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_SIZE);
  const endIndex = Math.min(
    processedData.length - 1,
    Math.floor((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER_SIZE
  );

  const visibleRows = useMemo(() => {
    return processedData.slice(startIndex, endIndex + 1);
  }, [processedData, startIndex, endIndex]);

  const translateY = startIndex * ROW_HEIGHT;

  // Calculate dynamic left offsets for pinned columns
  let currentLeftOffset = 0;
  const columnStyles = COLUMNS.reduce((acc, col) => {
    const isPinned = pinnedColumns.has(col.key);
    acc[col.key] = {
      width: col.width,
      minWidth: col.width,
      ...(isPinned && { left: currentLeftOffset })
    };
    if (isPinned) {
      currentLeftOffset += col.width;
    }
    return acc;
  }, {});

  if (loading) {
    return <div>Loading 1 million records...</div>;
  }

  return (
    <div className="app-container">
      <h1>Big Data Grid</h1>

      {/* Controls */}
      <div className="controls">
        <input
          type="text"
          placeholder="Filter Merchant..."
          data-test-id="filter-merchant"
          value={merchantFilter}
          onChange={e => setMerchantFilter(e.target.value)}
        />
        <span data-test-id="filter-count">
          Showing {processedData.length} of {data.length} rows
        </span>
        <button
          data-test-id="quick-filter-Completed"
          onClick={() => setStatusFilter(prev => prev === 'Completed' ? '' : 'Completed')}
          style={{ background: statusFilter === 'Completed' ? '#cceeff' : '' }}
        >
          Completed
        </button>
        <button
          data-test-id="quick-filter-Pending"
          onClick={() => setStatusFilter(prev => prev === 'Pending' ? '' : 'Pending')}
          style={{ background: statusFilter === 'Pending' ? '#cceeff' : '' }}
        >
          Pending
        </button>
      </div>

      {/* Grid Container */}
      <div className="grid-wrapper">
        <div
          className="grid-scroll-container"
          data-test-id="grid-scroll-container"
          ref={viewportRef}
          onScroll={handleScroll}
        >
          {/* Header */}
          <div className="grid-header">
            {COLUMNS.map(col => {
              const isPinned = pinnedColumns.has(col.key);
              return (
                <div
                  key={col.key}
                  className={`grid-header-cell ${isPinned ? 'pinned-column' : ''}`}
                  data-test-id={`header-${col.key}`}
                  style={columnStyles[col.key]}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="col-label">{col.label} {sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}</span>
                  <button
                    data-test-id={`pin-column-${col.key}`}
                    onClick={(e) => togglePin(e, col.key)}
                    style={{ marginLeft: 'auto', fontSize: '10px' }}
                  >
                    {isPinned ? 'Unpin' : 'Pin'}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ height: totalHeight, position: 'relative' }}>
            <div
              className="grid-row-window"
              data-test-id="grid-row-window"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${translateY}px)` }}
            >
              {/* Virtual Rows */}
              {visibleRows.map((row) => {
                // The requirement mentions 'cell-0-merchant'. Meaning index 0 might be visible row 0 OR actual index 0.
                // Using visible rows index might make it easier to test for "first row".
                // We will use actualIndex or rowIndex relative to visible? Let's assume the test targets the Nth visible row's cell or the actual row id's cell.
                // Looking at "cell-0-merchant" (format: cell-rowIndex-columnKey), it probably means the index in the ENTIRE rendered list, or just visible list. I'll simply map it to `processedData.indexOf(row)`
                const rowIndex = processedData.indexOf(row);

                return (
                  <div
                    key={row.id}
                    className="grid-row"
                    data-test-id={`virtual-row-${row.id}`}
                    data-selected={selectedIds.has(row.id) ? "true" : undefined}
                    onClick={(e) => handleRowClick(e, row.id)}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {COLUMNS.map(col => {
                      const isPinned = pinnedColumns.has(col.key);
                      const isEditing = editingCell?.id === row.id && editingCell?.key === col.key;

                      const cellValue = col.key === 'date'
                        ? new Date(row[col.key]).toLocaleDateString()
                        : (col.key === 'amount' ? `$${row[col.key].toFixed(2)}` : row[col.key]);

                      return (
                        <div
                          key={col.key}
                          className={`grid-cell ${isPinned ? 'pinned-column' : ''}`}
                          data-test-id={`cell-${rowIndex}-${col.key}`}
                          style={columnStyles[col.key]}
                          onDoubleClick={() => {
                            setEditingCell({ id: row.id, key: col.key });
                            setEditValue(row[col.key]);
                          }}
                        >
                          {isEditing ? (
                            <input
                              type={col.key === 'amount' || col.key === 'id' ? 'number' : 'text'}
                              value={editValue}
                              autoFocus
                              onChange={(e) => {
                                let val = e.target.value;
                                if (col.key === 'amount') val = parseFloat(val) || 0;
                                setEditValue(val);
                              }}
                              onBlur={() => handleEditSave(row.id, col.key, editValue)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditSave(row.id, col.key, editValue);
                              }}
                            />
                          ) : (
                            cellValue
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="debug-panel" data-test-id="debug-panel">
        <div>FPS: <span data-test-id="debug-fps">{fps}</span></div>
        <div>Rendered Rows: <span data-test-id="debug-rendered-rows">{visibleRows.length} + header</span></div>
        <div data-test-id="debug-scroll-position">
          Row {visibleRows.length > 0 ? processedData.indexOf(visibleRows[0]) : 0} / {processedData.length}
        </div>
      </div>
    </div>
  );
}

export default App;
