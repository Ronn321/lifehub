'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DragDropBlock {
  id: string;
  sortOrder: number;
  type?: string;
  content?: Record<string, unknown>;
  pageId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DragDropContainerProps {
  blocks: DragDropBlock[];
  onReorder: (oldIndex: number, newIndex: number) => void;
  children: (block: DragDropBlock, dragHandleProps: Record<string, unknown>) => React.ReactNode;
}

export function DragDropContainer({ blocks, onReorder, children }: DragDropContainerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.sortOrder - b.sortOrder), [blocks]);
  const blockIds = useMemo(() => sortedBlocks.map((b) => b.id), [sortedBlocks]);
  const activeBlock = useMemo(() => sortedBlocks.find((b) => b.id === activeId), [sortedBlocks, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = sortedBlocks.findIndex((b) => b.id === active.id);
        const newIndex = sortedBlocks.findIndex((b) => b.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          onReorder(oldIndex, newIndex);
        }
      }
    },
    [sortedBlocks, onReorder],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {sortedBlocks.map((block) => (
            <SortableBlock key={block.id} block={block}>
              {(dragHandleProps) => children(block, dragHandleProps)}
            </SortableBlock>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeBlock ? (
          <div className="opacity-80 bg-bg-surface rounded-lg p-3 shadow-lg border border-brand-500/30">
            <div className="text-sm text-fg-muted">Block wird verschoben...</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableBlock({
  block,
  children,
}: {
  block: DragDropBlock;
  children: (dragHandleProps: Record<string, unknown>) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto' as const,
  };

  const dragHandleProps = {
    ...attributes,
    ...listeners,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {children(dragHandleProps)}
    </div>
  );
}
