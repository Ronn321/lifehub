'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  Heart,
  Star,
  SlidersHorizontal,
  Search,
  X,
  ChevronDown,
  Eye,
  EyeOff,
  ImageIcon,
  Music,
  Play,
  Pause,
  MoreHorizontal,
} from 'lucide-react';
import { formatTime, getCoverUrl } from '@/lib/music-api';
import type { MusicTrack } from '@/lib/music-player-store';
import { MusicImage } from './MusicCard';
import { useSongContextMenu } from './ContextMenu';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ColumnId =
  | 'index'
  | 'cover'
  | 'title'
  | 'artist'
  | 'album'
  | 'genre'
  | 'year'
  | 'duration'
  | 'rating'
  | 'favorite'
  | 'quality'
  | 'bitrate'
  | 'dateAdded'
  | 'lastPlayed';

export type SortDirection = 'asc' | 'desc';
export type CoverSize = 'small' | 'medium' | 'large';
export type ViewMode = 'list' | 'compact' | 'card' | 'detail';

interface ColumnDef {
  id: ColumnId;
  label: string;
  shortLabel?: string;
  defaultVisible: boolean;
  sortable: boolean;
  className: string;
  width?: string;
  /**
   * Function to get the sort value from a track.
   * Returns a comparable value (string | number | boolean | undefined).
   */
  sortValue: (track: MusicTrack) => string | number | boolean | undefined;
  /**
   * Render function for the cell content
   */
  render: (track: MusicTrack, coverSize: CoverSize) => React.ReactNode;
  /**
   * Render function for the header cell
   */
  renderHeader?: (sortDir: SortDirection | null, onClick: () => void) => React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Column Definitions                                                */
/* ------------------------------------------------------------------ */

const COVER_SIZES: Record<CoverSize, number> = {
  small: 32,
  medium: 40,
  large: 56,
};

export const ALL_COLUMNS: ColumnDef[] = [
  {
    id: 'index',
    label: '#',
    defaultVisible: true,
    sortable: false,
    className: 'w-10 shrink-0 text-center',
    sortValue: () => 0,
    render: () => null, // handled specially
  },
  {
    id: 'cover',
    label: '',
    defaultVisible: true,
    sortable: false,
    className: 'shrink-0',
    sortValue: () => 0,
    render: () => null, // handled specially
  },
  {
    id: 'title',
    label: 'Titel',
    defaultVisible: true,
    sortable: true,
    className: 'min-w-0 flex-1',
    sortValue: (track) => track.title.toLowerCase(),
    render: (track) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--music-text-primary)]">
          {track.title}
        </p>
        <p className="truncate text-xs text-[var(--music-text-secondary)] md:hidden">
          {track.artist}
        </p>
      </div>
    ),
  },
  {
    id: 'artist',
    label: 'Interpret',
    defaultVisible: true,
    sortable: true,
    className: 'hidden min-w-0 flex-1 md:block',
    sortValue: (track) => track.artist.toLowerCase(),
    render: (track) => (
      <p className="truncate text-sm text-[var(--music-text-secondary)]">{track.artist}</p>
    ),
  },
  {
    id: 'album',
    label: 'Album',
    defaultVisible: true,
    sortable: true,
    className: 'hidden min-w-0 flex-[1.5] lg:block',
    sortValue: (track) => track.album.toLowerCase(),
    render: (track) => (
      <p className="truncate text-sm text-[var(--music-text-secondary)]">{track.album}</p>
    ),
  },
  {
    id: 'genre',
    label: 'Genre',
    defaultVisible: false,
    sortable: true,
    className: 'hidden w-28 shrink-0 xl:block',
    sortValue: (track) => track.genre?.toLowerCase() ?? '',
    render: (track) => (
      <p className="truncate text-sm text-[var(--music-text-secondary)]">{track.genre ?? '–'}</p>
    ),
  },
  {
    id: 'year',
    label: 'Jahr',
    defaultVisible: false,
    sortable: true,
    className: 'hidden w-16 shrink-0 text-center xl:block',
    sortValue: (track) => track.year ?? 0,
    render: (track) => (
      <p className="text-sm text-[var(--music-text-secondary)]">{track.year ?? '–'}</p>
    ),
  },
  {
    id: 'duration',
    label: 'Länge',
    defaultVisible: true,
    sortable: true,
    className: 'flex w-16 shrink-0 items-center justify-end',
    sortValue: (track) => track.duration,
    render: (track) => (
      <span className="text-xs tabular-nums text-[var(--music-text-secondary)]">
        {formatTime(track.duration)}
      </span>
    ),
    renderHeader: (sortDir, onClick) => (
      <button onClick={onClick} className="flex items-center justify-end gap-1 hover:text-[var(--music-text-primary)] transition-colors">
        <Clock className="h-3.5 w-3.5" />
        {sortDir && (
          sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        )}
      </button>
    ),
  },
  {
    id: 'rating',
    label: 'Bewertung',
    defaultVisible: false,
    sortable: true,
    className: 'hidden w-20 shrink-0 xl:flex items-center gap-1',
    sortValue: (track) => track.rating ?? 0,
    render: (track) => {
      const r = track.rating ?? 0;
      if (r <= 0) return <span className="text-xs text-[var(--music-text-disabled)]">–</span>;
      return (
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-[var(--music-accent)] text-[var(--music-accent)]" />
          <span className="text-xs tabular-nums text-[var(--music-text-secondary)]">
            {r.toFixed(1)}
          </span>
        </div>
      );
    },
  },
  {
    id: 'favorite',
    label: 'Favorit',
    defaultVisible: true,
    sortable: true,
    className: 'w-10 shrink-0 flex items-center justify-center',
    sortValue: (track) => track.isFavorite ? 1 : 0,
    render: (track) => (
      track.isFavorite ? (
        <Heart className="h-4 w-4 fill-[var(--music-accent)] text-[var(--music-accent)]" />
      ) : (
        <span className="text-[var(--music-text-disabled)]">–</span>
      )
    ),
  },
  {
    id: 'quality',
    label: 'Qualität',
    defaultVisible: false,
    sortable: true,
    className: 'hidden w-16 shrink-0 text-center 2xl:block',
    sortValue: (track) => {
      const q = track.quality?.toLowerCase() ?? '';
      const order = ['dsd', 'flac', 'alac', 'wav', 'aac', 'ogg', 'opus', 'mp3', 'wma'];
      const idx = order.indexOf(q);
      return idx >= 0 ? order.length - idx : 0;
    },
    render: (track) => (
      <span className="text-xs font-medium text-[var(--music-text-secondary)]">
        {track.quality ?? '–'}
      </span>
    ),
  },
  {
    id: 'bitrate',
    label: 'Bitrate',
    defaultVisible: false,
    sortable: true,
    className: 'hidden w-20 shrink-0 text-right 2xl:block',
    sortValue: (track) => track.bitrate ?? 0,
    render: (track) => {
      if (!track.bitrate) return <span className="text-xs text-[var(--music-text-disabled)]">–</span>;
      const mbps = (track.bitrate / 1000).toFixed(0);
      return (
        <span className="text-xs tabular-nums text-[var(--music-text-secondary)]">
          {mbps} kbps
        </span>
      );
    },
  },
  {
    id: 'dateAdded',
    label: 'Hinzugefügt',
    defaultVisible: false,
    sortable: true,
    className: 'hidden w-28 shrink-0 2xl:block',
    sortValue: (track) => track.dateAdded ?? '',
    render: (track) => {
      if (!track.dateAdded) return <span className="text-xs text-[var(--music-text-disabled)]">–</span>;
      const d = new Date(track.dateAdded);
      return (
        <span className="text-xs tabular-nums text-[var(--music-text-secondary)]">
          {d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
      );
    },
  },
  {
    id: 'lastPlayed',
    label: 'Zuletzt gehört',
    defaultVisible: false,
    sortable: true,
    className: 'hidden w-28 shrink-0 2xl:block',
    sortValue: (track) => track.lastPlayed ?? '',
    render: (track) => {
      if (!track.lastPlayed) return <span className="text-xs text-[var(--music-text-disabled)]">–</span>;
      const d = new Date(track.lastPlayed);
      const diff = Date.now() - d.getTime();
      const days = Math.floor(diff / (86400000));
      return (
        <span className="text-xs tabular-nums text-[var(--music-text-secondary)]">
          {days === 0 ? 'Heute' : days === 1 ? 'Gestern' : `${days} Tage`}
        </span>
      );
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Default visible columns                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_VISIBLE = ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id);

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Format bitrate for display */
function formatBitrate(bps?: number): string {
  if (!bps) return '–';
  return `${(bps / 1000).toFixed(0)} kbps`;
}

/** Format a date relative to now */
function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Heute';
  if (days === 1) return 'Gestern';
  if (days < 7) return `${days} Tage`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format a date for the "Added" column */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface TrackTableProps {
  tracks: MusicTrack[];
  isLoading?: boolean;
  currentTrackId?: string;
  onPlay: (index: number) => void;
  /** Optional: if provided, shows cover images (needs server context) */
  serverId?: string;
  accessToken?: string;
  /** Total count for display */
  totalCount?: number;
  /** Page info */
  page?: number;
  totalPages?: number;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  /** Override default cover size */
  defaultCoverSize?: CoverSize;
  /** Auto-focus search on mount */
  autoFocusSearch?: boolean;
  /** Minimum columns to always show (even if toggled off) */
  alwaysShow?: ColumnId[];
  /** View mode (default: list) */
  viewMode?: ViewMode;
  /** Compact rows (no padding) */
  compact?: boolean;
  /** Callback when sort column/direction changes (for server-side re-fetch) */
  onSortChange?: (columnId: ColumnId | null, direction: SortDirection) => void;
  /** External selection model (selected track IDs) */
  selectedIds?: Set<string>;
  /** Callback for row click (selection handling) */
  onRowClick?: (e: React.MouseEvent, trackId: string, index: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Column Visibility Dropdown                                        */
/* ------------------------------------------------------------------ */

function ColumnVisibilityDropdown({
  visible,
  onChange,
}: {
  visible: Set<ColumnId>;
  onChange: (cols: Set<ColumnId>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (colId: ColumnId) => {
    const next = new Set(visible);
    if (next.has(colId)) {
      next.delete(colId);
    } else {
      next.add(colId);
    }
    onChange(next);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--music-text-secondary)] transition-colors hover:bg-[var(--music-bg-hover)] hover:text-[var(--music-text-primary)]"
        title="Spalten ein-/ausblenden"
      >
        <Eye className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Spalten</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-modal)] py-1 shadow-2xl backdrop-blur-xl"
          style={{ maxHeight: '320px', overflowY: 'auto' }}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--music-text-secondary)]">
            Spalten ein-/ausblenden
          </div>
          {ALL_COLUMNS.filter((c) => c.id !== 'index' && c.id !== 'cover').map((col) => (
            <button
              key={col.id}
              onClick={() => toggle(col.id)}
              className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-xs text-[var(--music-text-primary)] transition-colors hover:bg-[var(--music-bg-hover)]"
            >
              {visible.has(col.id) ? (
                <Eye className="h-3.5 w-3.5 text-[var(--music-accent)]" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-[var(--music-text-disabled)]" />
              )}
              <span>{col.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cover Size Slider                                                 */
/* ------------------------------------------------------------------ */

function CoverSizeSlider({
  value,
  onChange,
}: {
  value: CoverSize;
  onChange: (v: CoverSize) => void;
}) {
  const sizes: CoverSize[] = ['small', 'medium', 'large'];
  const icons = ['S', 'M', 'L'];

  return (
    <div className="flex items-center gap-1">
      <ImageIcon className="h-3.5 w-3.5 text-[var(--music-text-secondary)]" />
      <div className="flex items-center gap-0.5 rounded-md bg-[var(--music-bg-elevated)] p-0.5">
        {sizes.map((size, i) => (
          <button
            key={size}
            onClick={() => onChange(size)}
            className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
              value === size
                ? 'bg-[var(--music-accent)] text-black'
                : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]'
            }`}
            title={`Cover: ${size === 'small' ? 'Klein' : size === 'medium' ? 'Mittel' : 'Groß'}`}
          >
            {icons[i]}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter Bar                                                        */
/* ------------------------------------------------------------------ */

interface FilterState {
  search: string;
  genre: string;
  artist: string;
  album: string;
  year: string;
}

function FilterBar({
  filters,
  onChange,
  uniqueGenres,
  uniqueArtists,
  uniqueYears,
  onClear,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  uniqueGenres: string[];
  uniqueArtists: string[];
  uniqueYears: number[];
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasFilters = filters.search || filters.genre || filters.artist || filters.album || filters.year;

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Search + filter toggle row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--music-text-disabled)]" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            placeholder="Suchen…"
            className="w-full rounded-md border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-elevated)] py-1.5 pl-8 pr-8 text-xs text-[var(--music-text-primary)] placeholder-[var(--music-text-disabled)] outline-none transition-colors focus:border-[var(--music-accent)]"
          />
          {filters.search && (
            <button
              onClick={() => update('search', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--music-text-disabled)] hover:text-[var(--music-text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            hasFilters
              ? 'bg-[var(--music-accent)]/10 text-[var(--music-accent)]'
              : 'text-[var(--music-text-secondary)] hover:bg-[var(--music-bg-hover)]'
          }`}
          title="Filter"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filter</span>
          {hasFilters && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--music-accent)] text-[10px] font-bold text-black">
              {(filters.genre ? 1 : 0) + (filters.artist ? 1 : 0) + (filters.album ? 1 : 0) + (filters.year ? 1 : 0) + (filters.search ? 1 : 0)}
            </span>
          )}
        </button>
        {(expanded || hasFilters) && (
          <button
            onClick={onClear}
            className="rounded-md px-2 py-1.5 text-xs text-[var(--music-text-disabled)] transition-colors hover:text-[var(--music-text-primary)]"
            title="Filter zurücksetzen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Expanded filter row */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.genre}
            onChange={(e) => update('genre', e.target.value)}
            className="rounded-md border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--music-text-primary)] outline-none transition-colors focus:border-[var(--music-accent)]"
          >
            <option value="">Alle Genres</option>
            {uniqueGenres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={filters.artist}
            onChange={(e) => update('artist', e.target.value)}
            className="rounded-md border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--music-text-primary)] outline-none transition-colors focus:border-[var(--music-accent)]"
          >
            <option value="">Alle Interpreten</option>
            {uniqueArtists.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={filters.year}
            onChange={(e) => update('year', e.target.value)}
            className="rounded-md border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--music-text-primary)] outline-none transition-colors focus:border-[var(--music-accent)]"
          >
            <option value="">Alle Jahre</option>
            {uniqueYears.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          <input
            type="text"
            value={filters.album}
            onChange={(e) => update('album', e.target.value)}
            placeholder="Album filtern…"
            className="rounded-md border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--music-text-primary)] placeholder-[var(--music-text-disabled)] outline-none transition-colors focus:border-[var(--music-accent)]"
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TrackTable Component                                              */
/* ------------------------------------------------------------------ */

export function TrackTable({
  tracks,
  isLoading = false,
  currentTrackId,
  onPlay,
  serverId,
  accessToken,
  totalCount,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
  defaultCoverSize = 'medium',
  alwaysShow = [],
  viewMode = 'list',
  compact = false,
  onSortChange,
  selectedIds,
  onRowClick,
}: TrackTableProps) {
  // ── State ──
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(new Set(DEFAULT_VISIBLE));
  const [sortColumn, setSortColumn] = useState<ColumnId | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [coverSize, setCoverSize] = useState<CoverSize>(defaultCoverSize);
  const [filters, setFilters] = useState<FilterState>({ search: '', genre: '', artist: '', album: '', year: '' });

  const onSongContextMenu = useSongContextMenu();

  // ── Unique values for filters ──
  const uniqueGenres = useMemo(() => {
    const s = new Set<string>();
    tracks.forEach((t) => { if (t.genre) s.add(t.genre); });
    return Array.from(s).sort();
  }, [tracks]);

  const uniqueArtists = useMemo(() => {
    const s = new Set<string>();
    tracks.forEach((t) => s.add(t.artist));
    return Array.from(s).sort();
  }, [tracks]);

  const uniqueYears = useMemo(() => {
    const s = new Set<number>();
    tracks.forEach((t) => { if (t.year) s.add(t.year); });
    return Array.from(s).sort((a, b) => b - a);
  }, [tracks]);

  // ── Filter + Sort ──
  const processedTracks = useMemo(() => {
    let result = [...tracks];

    // Apply filters
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q) ||
          (t.genre && t.genre.toLowerCase().includes(q)),
      );
    }
    if (filters.genre) {
      result = result.filter((t) => t.genre === filters.genre);
    }
    if (filters.artist) {
      result = result.filter((t) => t.artist === filters.artist);
    }
    if (filters.album) {
      result = result.filter((t) => t.album.toLowerCase().includes(filters.album.toLowerCase()));
    }
    if (filters.year) {
      result = result.filter((t) => String(t.year) === filters.year);
    }

    // Apply sorting
    if (sortColumn) {
      const colDef = ALL_COLUMNS.find((c) => c.id === sortColumn);
      if (colDef) {
        result.sort((a, b) => {
          const va = colDef.sortValue(a);
          const vb = colDef.sortValue(b);
          if (va === undefined && vb === undefined) return 0;
          if (va === undefined) return 1;
          if (vb === undefined) return -1;
          if (typeof va === 'string' && typeof vb === 'string') {
            return sortDirection === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
          }
          return sortDirection === 'asc'
            ? (va as number) - (vb as number)
            : (vb as number) - (va as number);
        });
      }
    }

    return result;
  }, [tracks, filters, sortColumn, sortDirection]);

  // ── Virtualizer ──
  const parentRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = compact ? 40 : coverSize === 'small' ? 48 : coverSize === 'large' ? 64 : 56;
  const virtualizer = useVirtualizer({
    count: processedTracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // ── Sort handler ──
  const handleSort = useCallback((colId: ColumnId) => {
    setSortColumn((prev) => {
      let newDir: SortDirection;
      if (prev === colId) {
        newDir = sortDirection === 'asc' ? 'desc' : 'asc';
        setSortDirection(newDir);
        onSortChange?.(colId, newDir);
        return prev;
      }
      setSortDirection('asc');
      onSortChange?.(colId, 'asc');
      return colId;
    });
  }, [sortDirection, onSortChange]);

  // ── Clear filters ──
  const clearFilters = useCallback(() => {
    setFilters({ search: '', genre: '', artist: '', album: '', year: '' });
  }, []);

  // ── Context menu handler ──
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, trackIndex: number) => {
      onSongContextMenu(e, {
        onPlay: () => onPlay(trackIndex),
        onAddToQueue: () => {},
        onToggleFavorite: () => {},
      });
    },
    [onPlay, onSongContextMenu],
  );

  // ── Ensure index, cover, title are always visible ──
  const effectiveVisible = useMemo(() => {
    const cols = new Set(visibleColumns);
    alwaysShow.forEach((id) => cols.add(id));
    // Always show index + cover + title
    cols.add('index');
    cols.add('cover');
    cols.add('title');
    return cols;
  }, [visibleColumns, alwaysShow]);

  // ── Visible column defs ──
  const visibleColDefs = useMemo(
    () => ALL_COLUMNS.filter((c) => effectiveVisible.has(c.id)),
    [effectiveVisible],
  );

  // ── Render ──

  // Determine if we're showing the meta columns section (right side)
  const metaColumns = visibleColDefs.filter(
    (c) => c.id !== 'index' && c.id !== 'cover' && c.id !== 'title',
  );

  const coverPx = COVER_SIZES[coverSize];

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2">
          <CoverSizeSlider value={coverSize} onChange={setCoverSize} />
          <span className="text-xs text-[var(--music-text-disabled)]">
            {processedTracks.length}
            {totalCount !== undefined && totalCount !== processedTracks.length
              ? ` / ${totalCount}`
              : ''}{' '}
            Titel
          </span>
        </div>
        <ColumnVisibilityDropdown
          visible={effectiveVisible}
          onChange={setVisibleColumns}
        />
      </div>

      {/* Filter bar */}
      <div className="px-4 pb-2">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          uniqueGenres={uniqueGenres}
          uniqueArtists={uniqueArtists}
          uniqueYears={uniqueYears}
          onClear={clearFilters}
        />
      </div>

      {/* Table header */}
      <div
        className={`flex items-center gap-3 border-b border-[rgba(255,255,255,0.1)] px-4 pb-2 text-xs uppercase tracking-wide text-[var(--music-text-secondary)] ${
          compact ? 'py-0' : ''
        }`}
        style={{ height: compact ? '32px' : '40px' }}
      >
        {visibleColDefs.map((col) => {
          if (col.id === 'index') {
            return (
              <div key={col.id} className={col.className} style={{ width: '32px' }}>
                <span>#</span>
              </div>
            );
          }
          if (col.id === 'cover') {
            return <div key={col.id} className={col.className} style={{ width: `${coverPx}px` }} />;
          }
          if (col.id === 'duration' && col.renderHeader) {
            return (
              <div key={col.id} className={col.className}>
                {col.renderHeader(
                  sortColumn === col.id ? sortDirection : null,
                  () => handleSort(col.id),
                )}
              </div>
            );
          }
          return (
            <div key={col.id} className={col.className}>
              {col.sortable ? (
                <button
                  onClick={() => handleSort(col.id)}
                  className="flex items-center gap-1 hover:text-[var(--music-text-primary)] transition-colors"
                >
                  {col.label}
                  {sortColumn === col.id ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="h-3 w-3 text-[var(--music-accent)]" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-[var(--music-accent)]" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  )}
                </button>
              ) : (
                <span>{col.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Table body */}
      {isLoading && processedTracks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--music-text-secondary)]">
          Wird geladen…
        </div>
      ) : processedTracks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20 text-center">
          <Music className="h-12 w-12 text-[var(--music-text-disabled)] opacity-40" />
          <p className="text-lg font-bold text-[var(--music-text-primary)]">Keine Titel gefunden</p>
          <p className="text-sm text-[var(--music-text-secondary)]">
            {filters.search || filters.genre || filters.artist || filters.album || filters.year
              ? 'Keine Ergebnisse für die aktuelle Filterauswahl.'
              : 'Füge Musik zu deiner Jellyfin-Bibliothek hinzu.'}
          </p>
          {(filters.search || filters.genre || filters.artist || filters.album || filters.year) && (
            <button
              onClick={clearFilters}
              className="mt-2 rounded-md bg-[var(--music-accent)] px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-[var(--music-accent-hover)]"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      ) : (
        <div
          ref={parentRef}
          className="flex-1 overflow-auto music-scroll rounded-md"
          style={{ background: 'var(--music-bg-elevated)' }}
        >
          <div
            style={{
              height: virtualizer.getTotalSize(),
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((vItem) => {
              const track = processedTracks[vItem.index]!;
              const isPlaying = currentTrackId === track.id;
              const isSelected = selectedIds?.has(track.id) ?? false;

              return (
                <div
                  key={vItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${ROW_HEIGHT}px`,
                    transform: `translateY(${vItem.start}px)`,
                  }}
                  onClick={(e) => onRowClick?.(e, track.id, vItem.index)}
                  onContextMenu={(e) => handleContextMenu(e, vItem.index)}
                  onDoubleClick={() => onPlay(vItem.index)}
                  className={`group flex items-center gap-3 rounded-md px-4 transition-colors hover:bg-[var(--music-bg-hover)] ${
                    isPlaying ? 'bg-[var(--music-accent)]/5' : ''
                  } ${
                    isSelected ? 'bg-[var(--music-bg-hover)] border-l-[3px] border-[var(--music-accent)]' : 'border-l-[3px] border-transparent'
                  } ${compact ? 'gap-2 px-3' : ''}`}
                >
                  {visibleColDefs.map((col) => {
                    // Index column
                    if (col.id === 'index') {
                      return (
                        <div
                          key={col.id}
                          className="flex w-8 shrink-0 items-center justify-center"
                        >
                          <span
                            className={`text-sm tabular-nums ${
                              isPlaying
                                ? 'text-[var(--music-accent)]'
                                : 'text-[var(--music-text-secondary)]'
                            }`}
                          >
                            {vItem.index + 1}
                          </span>
                        </div>
                      );
                    }

                    // Cover column
                    if (col.id === 'cover') {
                      const url =
                        serverId && accessToken
                          ? getCoverUrl(accessToken, serverId, track.albumId ?? track.id, coverPx * 2, coverPx * 2)
                          : track.coverUrl;
                      return (
                        <div
                          key={col.id}
                          className="shrink-0 overflow-hidden rounded"
                          style={{ width: `${coverPx}px`, height: `${coverPx}px` }}
                        >
                          <MusicImage
                            src={url}
                            alt={track.album}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      );
                    }

                    // All other columns
                    return (
                      <div key={col.id} className={col.className}>
                        {col.render(track, coverSize)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 text-xs text-[var(--music-text-secondary)]">
          <span>
            Seite {(page ?? 0) + 1} von {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevPage}
              disabled={!page || page <= 0}
              className="rounded-md px-3 py-1.5 transition-colors disabled:opacity-30 hover:bg-[var(--music-bg-hover)]"
            >
              Vorherige
            </button>
            <button
              onClick={onNextPage}
              disabled={page !== undefined && totalPages !== undefined && page >= totalPages - 1}
              className="rounded-md px-3 py-1.5 transition-colors disabled:opacity-30 hover:bg-[var(--music-bg-hover)]"
            >
              Nächste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
