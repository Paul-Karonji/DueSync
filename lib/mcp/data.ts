import { Priority, Prisma, Status } from '@prisma/client';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

import { prisma } from '../prisma';
import { resolveMcpUser } from './config';

const TASK_INCLUDE = {
  category: true,
  tags: {
    include: {
      tag: true,
    },
  },
} satisfies Prisma.TaskInclude;

export type TaskRecord = Prisma.TaskGetPayload<{
  include: typeof TASK_INCLUDE;
}>;

export interface ListTaskFilters {
  status?: Status;
  priority?: Priority;
  categoryId?: string;
  tagId?: string;
  search?: string;
  dueAfter?: string;
  dueBefore?: string;
  limit?: number;
}

function parseDateInput(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${value}`);
  }

  return date;
}

function createUtcDateForLocalDate(date: string, timezone: string, hours: number) {
  const [year, month, day] = date.split('-').map(Number);
  return fromZonedTime(new Date(year, month - 1, day, hours, 0, 0, 0), timezone);
}

export function getDayBoundsInTimezone(date: string | undefined, timezone: string) {
  const referenceDate = date
    ? createUtcDateForLocalDate(date, timezone, 12)
    : new Date();

  const zonedReference = toZonedTime(referenceDate, timezone);
  const year = zonedReference.getFullYear();
  const month = zonedReference.getMonth();
  const day = zonedReference.getDate();

  return {
    date: formatInTimeZone(referenceDate, timezone, 'yyyy-MM-dd'),
    start: fromZonedTime(new Date(year, month, day, 0, 0, 0, 0), timezone),
    end: fromZonedTime(new Date(year, month, day, 23, 59, 59, 999), timezone),
  };
}

function serializeTask(task: TaskRecord, timezone: string) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate.toISOString(),
    dueDateLabel: formatInTimeZone(task.dueDate, timezone, 'yyyy-MM-dd'),
    dueTime: task.dueTime,
    priority: task.priority,
    status: task.status,
    categoryId: task.categoryId,
    estimatedTime: task.estimatedTime,
    isRecurring: task.isRecurring,
    recurringPattern: task.recurringPattern,
    googleEventId: task.googleEventId,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    category: task.category
      ? {
          id: task.category.id,
          name: task.category.name,
          color: task.category.color,
        }
      : null,
    tags: task.tags.map((taskTag) => ({
      id: taskTag.tag.id,
      name: taskTag.tag.name,
      color: taskTag.tag.color,
    })),
  };
}

export async function getUserContext(authInfo?: AuthInfo) {
  const user = await resolveMcpUser(authInfo);

  const [pendingTasks, completedTasks, archivedTasks] = await Promise.all([
    prisma.task.count({
      where: {
        userId: user.id,
        status: Status.PENDING,
      },
    }),
    prisma.task.count({
      where: {
        userId: user.id,
        status: Status.COMPLETED,
      },
    }),
    prisma.task.count({
      where: {
        userId: user.id,
        status: Status.ARCHIVED,
      },
    }),
  ]);

  return {
    ...user,
    taskCounts: {
      pending: pendingTasks,
      completed: completedTasks,
      archived: archivedTasks,
    },
  };
}

export async function listTasks(filters: ListTaskFilters = {}, authInfo?: AuthInfo) {
  const user = await resolveMcpUser(authInfo);

  const where: Prisma.TaskWhereInput = {
    userId: user.id,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.tagId) {
    where.tags = {
      some: {
        tagId: filters.tagId,
      },
    };
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const dueAfter = parseDateInput(filters.dueAfter);
  const dueBefore = parseDateInput(filters.dueBefore);

  if (dueAfter || dueBefore) {
    where.dueDate = {
      ...(dueAfter ? { gte: dueAfter } : {}),
      ...(dueBefore ? { lte: dueBefore } : {}),
    };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: TASK_INCLUDE,
    orderBy: [
      { status: 'asc' },
      { dueDate: 'asc' },
      { dueTime: 'asc' },
      { priority: 'asc' },
      { createdAt: 'asc' },
    ],
    take: filters.limit ?? 50,
  });

  return {
    user,
    tasks: tasks.map((task) => serializeTask(task, user.timezone)),
  };
}

export async function getTask(taskId: string, authInfo?: AuthInfo) {
  const user = await resolveMcpUser(authInfo);

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId: user.id,
    },
    include: TASK_INCLUDE,
  });

  if (!task) {
    throw new Error(`Task ${taskId} was not found for the configured DueSync user.`);
  }

  return {
    user,
    task: serializeTask(task, user.timezone),
  };
}

export async function getTasksForDay(date?: string, authInfo?: AuthInfo) {
  const user = await resolveMcpUser(authInfo);
  const bounds = getDayBoundsInTimezone(date, user.timezone);

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      status: Status.PENDING,
      dueDate: {
        gte: bounds.start,
        lte: bounds.end,
      },
    },
    include: TASK_INCLUDE,
    orderBy: [
      { priority: 'asc' },
      { dueTime: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  return {
    user,
    date: bounds.date,
    tasks: tasks.map((task) => serializeTask(task, user.timezone)),
  };
}

export async function getPendingTasksForPlanning(
  date?: string,
  includeBacklog = true,
  authInfo?: AuthInfo
) {
  const user = await resolveMcpUser(authInfo);
  const bounds = getDayBoundsInTimezone(date, user.timezone);
  const upcomingWindowEnd = addDays(bounds.end, 7);

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      status: Status.PENDING,
      dueDate: includeBacklog
        ? {
            lte: upcomingWindowEnd,
          }
        : {
            gte: bounds.start,
            lte: bounds.end,
          },
    },
    include: TASK_INCLUDE,
    orderBy: [
      { dueDate: 'asc' },
      { dueTime: 'asc' },
      { priority: 'asc' },
      { createdAt: 'asc' },
    ],
    take: 200,
  });

  return {
    user,
    date: bounds.date,
    tasks,
  };
}

export async function listCategories(authInfo?: AuthInfo) {
  const user = await resolveMcpUser(authInfo);

  const categories = await prisma.category.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      name: 'asc',
    },
    include: {
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });

  return {
    user,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      taskCount: category._count.tasks,
      createdAt: category.createdAt.toISOString(),
    })),
  };
}

export async function listTags(authInfo?: AuthInfo) {
  const user = await resolveMcpUser(authInfo);

  const tags = await prisma.tag.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      name: 'asc',
    },
    include: {
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });

  return {
    user,
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      taskCount: tag._count.tasks,
      createdAt: tag.createdAt.toISOString(),
    })),
  };
}
