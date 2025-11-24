'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateTaskSchema } from '@/lib/validations/task';
import { Priority, Status, RecurringPattern } from '@prisma/client';
import { PRIORITY_LABELS, STATUS_LABELS, Task } from '@/types';
import { toast } from 'sonner';
import { useCategories } from '@/lib/hooks/useCategories';
import { useTags } from '@/lib/hooks/useTags';
import { useUpdateTask } from '@/lib/hooks/useTasks';
import { format } from 'date-fns';

interface EditTaskDialogProps {
  userId: string;
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTaskDialog({
  userId,
  task,
  open,
  onOpenChange,
}: EditTaskDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const updateTask = useUpdateTask();
  const { data: categories = [] } = useCategories(userId);
  const { data: tags = [] } = useTags(userId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(updateTaskSchema),
    defaultValues: {
      priority: Priority.MEDIUM,
      status: Status.PENDING,
      categoryId: null,
      isRecurring: false,
      recurringPattern: null,
    },
  });

  const priority = watch('priority');
  const status = watch('status');
  const categoryId = watch('categoryId');
  const isRecurring = watch('isRecurring');
  const recurringPattern = watch('recurringPattern');

  // Populate form with task data when dialog opens
  useEffect(() => {
    if (task && open) {
      // Format the date for the date input (YYYY-MM-DD)
      const formattedDate = task.dueDate
        ? format(new Date(task.dueDate), 'yyyy-MM-dd')
        : '';

      reset({
        title: task.title,
        description: task.description || '',
        dueDate: formattedDate,
        dueTime: task.dueTime || '',
        priority: task.priority,
        status: task.status,
        categoryId: task.categoryId || null,
        estimatedTime: task.estimatedTime || undefined,
        isRecurring: task.isRecurring,
        recurringPattern: task.recurringPattern || null,
      });

      // Set selected tags
      const taskTagIds = task.tags?.map((tt) => tt.tagId) || [];
      setSelectedTags(taskTagIds);
    }
  }, [task, open, reset]);

  const handleFormSubmit = async (data: any) => {
    if (!task) return;

    try {
      const updateData = {
        ...data,
        tagIds: selectedTags.length > 0 ? selectedTags : undefined,
      };

      await updateTask.mutateAsync({ id: task.id, data: updateData });

      toast.success('Task updated successfully!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task');
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update your task details below. All fields are optional except title and due date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="edit-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-title"
              placeholder="What needs to be done?"
              autoFocus
              {...register('title')}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Add more details..."
              rows={3}
              {...register('description')}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-dueDate">
                Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-dueDate"
                type="date"
                {...register('dueDate')}
                className={errors.dueDate ? 'border-red-500' : ''}
              />
              {errors.dueDate && (
                <p className="text-sm text-red-600 mt-1">{errors.dueDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-dueTime">Due Time</Label>
              <Input
                id="edit-dueTime"
                type="time"
                {...register('dueTime')}
                className={errors.dueTime ? 'border-red-500' : ''}
              />
              {errors.dueTime && (
                <p className="text-sm text-red-600 mt-1">{errors.dueTime.message}</p>
              )}
            </div>
          </div>

          {/* Priority, Status, and Estimated Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="edit-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setValue('priority', value as Priority)}
              >
                <SelectTrigger id="edit-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Priority.HIGH}>{PRIORITY_LABELS.HIGH}</SelectItem>
                  <SelectItem value={Priority.MEDIUM}>{PRIORITY_LABELS.MEDIUM}</SelectItem>
                  <SelectItem value={Priority.LOW}>{PRIORITY_LABELS.LOW}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setValue('status', value as Status)}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Status.PENDING}>{STATUS_LABELS.PENDING}</SelectItem>
                  <SelectItem value={Status.COMPLETED}>{STATUS_LABELS.COMPLETED}</SelectItem>
                  <SelectItem value={Status.ARCHIVED}>{STATUS_LABELS.ARCHIVED}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-estimatedTime">Est. Time (min)</Label>
              <Input
                id="edit-estimatedTime"
                type="number"
                min="1"
                max="1440"
                placeholder="e.g., 60"
                {...register('estimatedTime', { valueAsNumber: true })}
                className={errors.estimatedTime ? 'border-red-500' : ''}
              />
              {errors.estimatedTime && (
                <p className="text-sm text-red-600 mt-1">{errors.estimatedTime.message}</p>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="edit-category">Category</Label>
            <Select
              value={categoryId || undefined}
              onValueChange={(value) => setValue('categoryId', value || null)}
            >
              <SelectTrigger id="edit-category">
                <SelectValue placeholder="Select a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <Label>Tags (optional)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 px-3 py-1.5 border rounded-md hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => handleTagToggle(tag.id)}
                  >
                    <Checkbox
                      checked={selectedTags.includes(tag.id)}
                      onCheckedChange={() => handleTagToggle(tag.id)}
                    />
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm">{tag.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recurring Task */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isRecurring}
                onCheckedChange={(checked) => {
                  setValue('isRecurring', checked as boolean);
                  if (!checked) {
                    setValue('recurringPattern', null);
                  }
                }}
              />
              <Label className="flex items-center gap-2 cursor-pointer">
                <Repeat className="h-4 w-4" />
                Make this a recurring task
              </Label>
            </div>

            {isRecurring && (
              <div>
                <Label htmlFor="edit-recurringPattern">Recurring Pattern</Label>
                <Select
                  value={recurringPattern || undefined}
                  onValueChange={(value) =>
                    setValue('recurringPattern', value as RecurringPattern)
                  }
                >
                  <SelectTrigger id="edit-recurringPattern">
                    <SelectValue placeholder="Select pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RecurringPattern.DAILY}>Daily</SelectItem>
                    <SelectItem value={RecurringPattern.WEEKLY}>Weekly</SelectItem>
                    <SelectItem value={RecurringPattern.MONTHLY}>Monthly</SelectItem>
                  </SelectContent>
                </Select>
                {errors.recurringPattern && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.recurringPattern.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-4">
            <Button type="submit" disabled={updateTask.isPending}>
              {updateTask.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateTask.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
