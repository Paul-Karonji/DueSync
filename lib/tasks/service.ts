import { Prisma, Status } from '@prisma/client';

import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';
import { calculateNextRecurringDate } from '@/lib/utils';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validations/task';

export class TaskMutationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'TaskMutationError';
  }
}

export const TASK_INCLUDE = {
  category: true,
  tags: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{
  include: typeof TASK_INCLUDE;
}>;

interface TaskMutationResult {
  task: TaskWithRelations;
  nextTask: TaskWithRelations | null;
}

async function ensureUserOwnsCategory(userId: string, categoryId?: string | null) {
  if (categoryId === undefined || categoryId === null) {
    return;
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!category) {
    throw new TaskMutationError(`Category ${categoryId} was not found for this DueSync user.`, 400);
  }
}

async function normalizeUserTagIds(userId: string, tagIds?: string[]) {
  if (tagIds === undefined) {
    return undefined;
  }

  const uniqueTagIds = [...new Set(tagIds)];

  if (uniqueTagIds.length === 0) {
    return uniqueTagIds;
  }

  const tags = await prisma.tag.findMany({
    where: {
      id: {
        in: uniqueTagIds,
      },
      userId,
    },
    select: {
      id: true,
    },
  });

  if (tags.length !== uniqueTagIds.length) {
    const foundIds = new Set(tags.map((tag) => tag.id));
    const missingTagIds = uniqueTagIds.filter((tagId) => !foundIds.has(tagId));

    throw new TaskMutationError(
      `One or more tags were not found for this DueSync user: ${missingTagIds.join(', ')}`,
      400
    );
  }

  return uniqueTagIds;
}

async function getOwnedTaskOrThrow(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
  });

  if (!task) {
    throw new TaskMutationError('Task not found', 404);
  }

  if (task.userId !== userId) {
    throw new TaskMutationError('Unauthorized', 403);
  }

  return task;
}

async function userHasGoogleCalendarAccess(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'google',
    },
    select: {
      access_token: true,
    },
  });

  return Boolean(account?.access_token);
}

function createTagConnections(tagIds?: string[]) {
  if (!tagIds || tagIds.length === 0) {
    return undefined;
  }

  return {
    create: tagIds.map((tagId) => ({
      tag: {
        connect: {
          id: tagId,
        },
      },
    })),
  };
}

function scheduleCalendarCreation(userId: string, task: TaskWithRelations) {
  createCalendarEvent(userId, task)
    .then(() => {
      console.log('Task successfully synced to Google Calendar:', task.id);
    })
    .catch((calendarError: unknown) => {
      console.error('Failed to auto-sync task to calendar:', {
        taskId: task.id,
        error: calendarError instanceof Error ? calendarError.message : String(calendarError),
      });
    });
}

function scheduleCalendarUpdate(userId: string, task: TaskWithRelations) {
  if (!task.googleEventId) {
    return;
  }

  updateCalendarEvent(userId, task.googleEventId, task)
    .then(() => {
      console.log('Calendar event updated successfully:', task.id);
    })
    .catch((calendarError: unknown) => {
      console.error('Failed to auto-update calendar event:', {
        taskId: task.id,
        eventId: task.googleEventId,
        error: calendarError instanceof Error ? calendarError.message : String(calendarError),
      });
    });
}

function scheduleCalendarDeletion(userId: string, taskId: string, eventId: string) {
  deleteCalendarEvent(userId, eventId)
    .then(() => {
      console.log('Calendar event deleted successfully:', eventId);
    })
    .catch((calendarError: unknown) => {
      console.error('Failed to delete calendar event:', {
        taskId,
        eventId,
        error: calendarError instanceof Error ? calendarError.message : String(calendarError),
      });
    });
}

export async function createTaskForUser(userId: string, input: CreateTaskInput) {
  await ensureUserOwnsCategory(userId, input.categoryId);
  const tagIds = await normalizeUserTagIds(userId, input.tagIds);

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      dueDate: new Date(input.dueDate),
      dueTime: input.dueTime,
      priority: input.priority,
      categoryId: input.categoryId,
      estimatedTime: input.estimatedTime,
      isRecurring: input.isRecurring,
      recurringPattern: input.recurringPattern,
      userId,
      tags: createTagConnections(tagIds),
    },
    include: TASK_INCLUDE,
  });

  if (await userHasGoogleCalendarAccess(userId)) {
    scheduleCalendarCreation(userId, task);
  }

  return {
    task,
  };
}

export async function updateTaskForUser(
  userId: string,
  taskId: string,
  input: UpdateTaskInput
): Promise<TaskMutationResult> {
  const existingTask = await getOwnedTaskOrThrow(userId, taskId);

  if (input.categoryId !== undefined) {
    await ensureUserOwnsCategory(userId, input.categoryId);
  }

  const tagIds = input.tagIds !== undefined
    ? await normalizeUserTagIds(userId, input.tagIds)
    : undefined;

  const updateData: Prisma.TaskUpdateInput = {
    title: input.title,
    description: input.description,
    dueTime: input.dueTime,
    priority: input.priority,
    status: input.status,
    category:
      input.categoryId === undefined
        ? undefined
        : input.categoryId === null
          ? { disconnect: true }
          : { connect: { id: input.categoryId } },
    estimatedTime: input.estimatedTime,
    isRecurring: input.isRecurring,
    recurringPattern: input.recurringPattern,
  };

  if (input.dueDate !== undefined) {
    updateData.dueDate = new Date(input.dueDate);
  }

  if (input.completedAt !== undefined) {
    updateData.completedAt = input.completedAt ? new Date(input.completedAt) : null;
  }

  if (tagIds !== undefined) {
    updateData.tags = {
      deleteMany: {},
      ...(tagIds.length > 0 ? createTagConnections(tagIds) : {}),
    };
  }

  let task = await prisma.task.update({
    where: {
      id: taskId,
    },
    data: updateData,
    include: TASK_INCLUDE,
  });

  const justCompleted = existingTask.status !== Status.COMPLETED && task.status === Status.COMPLETED;

  if (task.googleEventId) {
    if (justCompleted) {
      const eventIdToDelete = task.googleEventId;

      task = await prisma.task.update({
        where: {
          id: taskId,
        },
        data: {
          googleEventId: null,
        },
        include: TASK_INCLUDE,
      });

      scheduleCalendarDeletion(userId, task.id, eventIdToDelete);
    } else {
      scheduleCalendarUpdate(userId, task);
    }
  }

  let nextTask: TaskWithRelations | null = null;

  if (justCompleted && task.isRecurring && task.recurringPattern) {
    try {
      nextTask = await prisma.task.create({
        data: {
          title: task.title,
          description: task.description,
          dueDate: calculateNextRecurringDate(task.dueDate, task.recurringPattern),
          dueTime: task.dueTime,
          priority: task.priority,
          categoryId: task.categoryId,
          estimatedTime: task.estimatedTime,
          isRecurring: true,
          recurringPattern: task.recurringPattern,
          userId: task.userId,
          status: Status.PENDING,
        },
        include: TASK_INCLUDE,
      });

      console.log(`Generated next recurring task: ${nextTask.id} for pattern: ${task.recurringPattern}`);
    } catch (recurringError) {
      console.error('Failed to generate recurring task:', recurringError);
    }
  }

  return {
    task,
    nextTask,
  };
}

export async function completeTaskForUser(userId: string, taskId: string) {
  return updateTaskForUser(userId, taskId, {
    status: Status.COMPLETED,
    completedAt: new Date(),
  });
}

export async function archiveTaskForUser(userId: string, taskId: string) {
  return updateTaskForUser(userId, taskId, {
    status: Status.ARCHIVED,
  });
}

export async function deleteTaskForUser(userId: string, taskId: string) {
  const existingTask = await getOwnedTaskOrThrow(userId, taskId);

  await prisma.task.delete({
    where: {
      id: taskId,
    },
  });

  if (existingTask.googleEventId) {
    scheduleCalendarDeletion(userId, existingTask.id, existingTask.googleEventId);
  }

  return {
    taskId: existingTask.id,
    title: existingTask.title,
    status: existingTask.status,
  };
}
