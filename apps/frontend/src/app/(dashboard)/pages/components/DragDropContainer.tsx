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
  children: (block: DragDropBlock, dragHandleProps: Record<string, unknown>, isDragging: boolean) => React.ReactNode;
}

export function DragDropContainer({ blocks, onReorder, children }: DragDropContainerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.sortOrder - b.sortOrder), [blocks]);
  const blockIds = useMemo(() => sortedBlocks.map((b) => b.id), [sortedBlocks]);
  const activeBlock = useMemo(() => sortedBlocks.find((b) => b.id === activeId), [sortedBlocks, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log('[DragDrop] handleDragStart:', { activeId: event.active.id });
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      console.log('[DragDrop] handleDragEnd:', { activeId: active.id, overId: over?.id });

      if (over && active.id !== over.id) {
        const oldIndex = sortedBlocks.findIndex((b) => b.id === active.id);
        const newIndex = sortedBlocks.findIndex((b) => b.id === over.id);
        console.log('[DragDrop] indices:', { oldIndex, newIndex });
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
              {(dragHandleProps, isDragging) => children(block, dragHandleProps, isDragging)}
            </SortableBlock>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeBlock ? (
          <div className="opacity-90 bg-bg rounded-lg shadow-xl border border-brand-500/40 px-3 py-2">
            <div className="text-sm text-fg font-medium truncate">{activeBlock.type === 'heading' ? (activeBlock.content?.text as string) || 'Überschrift' : activeBlock.type === 'text' ? 'Text-Block' : activeBlock.type === 'todo' ? (activeBlock.content?.text as string) || 'Aufgabe' : activeBlock.type === 'code' ? 'Code-Block' : activeBlock.type === 'quote' ? 'Zitat' : activeBlock.type === 'callout' ? 'Hinweis' : activeBlock.type === 'bookmark' ? (activeBlock.content?.url as string) || 'Link' : activeBlock.type === 'table' ? 'Tabelle' : activeBlock.type === 'toggle' ? (activeBlock.content?.label as string) || 'Toggle' : activeBlock.type === 'divider' ? '—' : 'Block'}</div>
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
  children: (dragHandleProps: Record<string, unknown>, isDragging: boolean) => React.ReactNode;
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
    zIndex: isDragging ? 10 : 'auto' as const,
    touchAction: 'manipulation' as const,
  };

  const dragHandleProps = {
    ...attributes,
    ...listeners,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'opacity-40' : ''}`}
    >
      {children(dragHandleProps, isDragging)}
    </div>
  );
}
