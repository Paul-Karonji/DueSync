'use client';

import { Task } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Pencil,
  Trash2,
  Tag as TagIcon,
  Folder,
  Repeat,
  Archive,
} from 'lucide-react';
import {
  cn,
  formatRelativeDate,
  formatTime12Hour,
  formatEstimatedTime,
  getPriorityColorClass,
  getPriorityBgClass,
  getPriorityTextClass,
  isOverdue,
} from '@/lib/utils';
import { PRIORITY_LABELS } from '@/types';
import { CalendarSyncButton } from './CalendarSyncButton';
import { useTimezone } from '@/lib/hooks/useTimezone';

interface TaskCardProps {
  task: Task;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onArchive?: (taskId: string) => void;
}

export function TaskCard({ task, onToggleComplete, onEdit, onDelete, onArchive }: TaskCardProps) {
  const { timezone } = useTimezone();
  const isCompleted = task.status === 'COMPLETED';
  const taskIsOverdue = isOverdue(task.dueDate, task.status);

  const handleCheckboxChange = (checked: boolean) => {
    onToggleComplete?.(task.id, checked);
  };

  return (
    <div
      data-task-id={task.id}
      className={cn(
        'group relative rounded-lg border bg-white dark:bg-slate-800 p-3 sm:p-4 shadow-card dark:shadow-card-dark transition-all duration-200 hover:shadow-card-hover dark:hover:shadow-card-hover-dark hover:scale-[1.01]',
        'border-l-4',
        getPriorityColorClass(task.priority),
        'border-t border-r border-b border-slate-200 dark:border-slate-700',
        isCompleted && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleCheckboxChange}
          className="mt-1 flex-shrink-0"
          aria-label={`Mark "${task.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            className={cn(
              'text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 mb-1',
              isCompleted && 'line-through text-slate-500 dark:text-slate-400'
            )}
          >
            {task.title}
          </h3>

          {/* Description */}
          {task.description && (
            <p
              className={cn(
                'text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2',
                isCompleted && 'text-slate-400 dark:text-slate-500'
              )}
            >
              {task.description}
            </p>
          )}

          {/* Meta information */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            {/* Due Date */}
            <div
              className={cn(
                'flex items-center gap-1',
                taskIsOverdue && 'text-red-500 dark:text-red-400 font-medium'
              )}
            >
              <Calendar className="h-4 w-4" />
              <span>{formatRelativeDate(task.dueDate, timezone)}</span>
              {task.dueTime && (
                <>
                  <span className="mx-1">•</span>
                  <Clock className="h-4 w-4" />
                  <span>{formatTime12Hour(task.dueTime)}</span>
                </>
              )}
            </div>

            {/* Recurring Indicator */}
            {task.isRecurring && task.recurringPattern && (
              <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                <Repeat className="h-4 w-4" />
                <span className="capitalize">{task.recurringPattern.toLowerCase()}</span>
              </div>
            )}

            {/* Estimated Time */}
            {task.estimatedTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatEstimatedTime(task.estimatedTime)}</span>
              </div>
            )}

            {/* Category */}
            {task.category && (
              <div className="flex items-center gap-1">
                <Folder className="h-4 w-4" />
                <span>{task.category.name}</span>
              </div>
            )}
          </div>

          {/* Tags and Priority */}
          {(task.tags && task.tags.length > 0) || task.priority && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Priority Badge */}
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs font-medium',
                  getPriorityBgClass(task.priority),
                  getPriorityTextClass(task.priority)
                )}
              >
                {PRIORITY_LABELS[task.priority]}
              </Badge>

              {/* Tags */}
              {task.tags?.map((taskTag) => (
                <Badge
                  key={taskTag.tag.id}
                  variant="outline"
                  className="text-xs"
                  style={{
                    borderColor: taskTag.tag.color,
                    color: taskTag.tag.color,
                  }}
                >
                  <TagIcon className="h-3 w-3 mr-1" />
                  {taskTag.tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons (show on hover or always on mobile) */}
        <div className={cn(
          "flex items-center gap-0.5 sm:gap-1 transition-opacity flex-shrink-0",
          "md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100", // Show on hover AND focus
          "opacity-100" // Always visible on mobile
        )}>
          <CalendarSyncButton task={task} size="icon" variant="ghost" />
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              aria-label={`Edit task "${task.title}"`}
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onArchive && task.status !== 'ARCHIVED' && (
            <button
              onClick={() => onArchive(task.id)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              aria-label={`Archive task "${task.title}"`}
            >
              <Archive className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label={`Delete task "${task.title}"`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Overdue indicator */}
      {taskIsOverdue && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
            Overdue
          </span>
        </div>
      )}
    </div>
  );
}
