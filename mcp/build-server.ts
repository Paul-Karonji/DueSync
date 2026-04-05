import { Priority, RecurringPattern, Status } from '@prisma/client';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  getTask,
  getTasksForDay,
  getUserContext,
  listCategories,
  listTags,
  listTasks,
  getPendingTasksForPlanning,
} from '../lib/mcp/data';
import { MCP_WRITE_SCOPE } from '../lib/mcp/token-auth';
import { buildDayPlan } from '../lib/planning/day-plan';
import {
  archiveTaskForUser,
  completeTaskForUser,
  createTaskForUser,
  deleteTaskForUser,
  updateTaskForUser,
} from '../lib/tasks/service';
import { createTaskSchema, updateTaskSchema } from '../lib/validations/task';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm format');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD format');
const dateTimeSchema = z.string().datetime();

const createTaskToolSchema = {
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  dueDate: z.union([dateSchema, dateTimeSchema]),
  dueTime: timeSchema.optional().nullable(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  categoryId: z.string().cuid().optional().nullable(),
  estimatedTime: z.number().int().min(1).max(1440).optional().nullable(),
  tagIds: z.array(z.string().cuid()).optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.nativeEnum(RecurringPattern).optional().nullable(),
};

const updateTaskToolSchema = {
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  dueDate: z.union([dateSchema, dateTimeSchema]).optional(),
  dueTime: timeSchema.optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(Status).optional(),
  categoryId: z.string().cuid().optional().nullable(),
  estimatedTime: z.number().int().min(1).max(1440).optional().nullable(),
  tagIds: z.array(z.string().cuid()).optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.nativeEnum(RecurringPattern).optional().nullable(),
  completedAt: dateTimeSchema.optional().nullable(),
};

function asToolResult(text: string, structuredContent?: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text }],
    ...(structuredContent ? { structuredContent } : {}),
  };
}

function requireAuthInfo(extra?: { authInfo?: AuthInfo }) {
  if (!extra?.authInfo) {
    throw new Error('Missing MCP authentication context.');
  }

  return extra.authInfo;
}

function requireScopedUserId(extra: { authInfo?: AuthInfo } | undefined, scope?: string) {
  const authInfo = requireAuthInfo(extra);

  if (scope && !authInfo.scopes?.includes(scope)) {
    throw new Error(`Missing MCP scope ${scope}.`);
  }

  const userId = authInfo.extra?.userId;

  if (typeof userId !== 'string' || userId.length === 0) {
    throw new Error('Missing DueSync user in MCP authentication context.');
  }

  return {
    authInfo,
    userId,
  };
}

function summarizeTasks(tasks: Array<{ title: string; priority: string; dueDateLabel: string; dueTime: string | null }>) {
  if (tasks.length === 0) {
    return 'No tasks matched the request.';
  }

  const preview = tasks
    .slice(0, 5)
    .map((task, index) => {
      const timePart = task.dueTime ? ` ${task.dueTime}` : '';
      return `${index + 1}. ${task.title} [${task.priority}] due ${task.dueDateLabel}${timePart}`;
    })
    .join('\n');

  return `Found ${tasks.length} task${tasks.length === 1 ? '' : 's'}.\n${preview}`;
}

function summarizeTaskMutation(action: string, task: { title: string; status: string; dueDate: Date; dueTime: string | null }) {
  const dueDate = task.dueDate.toISOString().slice(0, 10);
  const dueTime = task.dueTime ? ` at ${task.dueTime}` : '';

  return `${action}: ${task.title} is now ${task.status.toLowerCase()} and due on ${dueDate}${dueTime}.`;
}

export function createDueSyncMcpServer() {
  const server = new McpServer({
    name: 'duesync-planner',
    version: '0.3.0',
  });

  server.registerTool(
    'get_user_context',
    {
      title: 'Get DueSync User Context',
      description: 'Return the authenticated DueSync user profile, timezone, and high-level task counts.',
    },
    async (extra) => {
      const userContext = await getUserContext(requireAuthInfo(extra));

      return asToolResult(
        `Using DueSync user ${userContext.email} in timezone ${userContext.timezone}. Pending: ${userContext.taskCounts.pending}, completed: ${userContext.taskCounts.completed}, archived: ${userContext.taskCounts.archived}.`,
        userContext
      );
    }
  );

  server.registerTool(
    'list_tasks',
    {
      title: 'List DueSync Tasks',
      description: 'List tasks for the authenticated DueSync user with optional filters.',
      inputSchema: {
        status: z.nativeEnum(Status).optional(),
        priority: z.nativeEnum(Priority).optional(),
        categoryId: z.string().cuid().optional(),
        tagId: z.string().cuid().optional(),
        search: z.string().max(255).optional(),
        dueAfter: z.string().datetime().optional(),
        dueBefore: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (input, extra) => {
      const result = await listTasks(input, requireAuthInfo(extra));

      return asToolResult(
        summarizeTasks(result.tasks),
        {
          user: {
            email: result.user.email,
            timezone: result.user.timezone,
          },
          total: result.tasks.length,
          tasks: result.tasks,
        }
      );
    }
  );

  server.registerTool(
    'get_task',
    {
      title: 'Get DueSync Task',
      description: 'Fetch one task by id for the authenticated DueSync user.',
      inputSchema: {
        taskId: z.string().cuid(),
      },
    },
    async ({ taskId }, extra) => {
      const result = await getTask(taskId, requireAuthInfo(extra));
      const task = result.task;
      const dueTime = task.dueTime ? ` at ${task.dueTime}` : '';

      return asToolResult(
        `${task.title} is ${task.status.toLowerCase()} with ${task.priority.toLowerCase()} priority and is due on ${task.dueDateLabel}${dueTime}.`,
        {
          user: {
            email: result.user.email,
            timezone: result.user.timezone,
          },
          task,
        }
      );
    }
  );

  server.registerTool(
    'get_today_tasks',
    {
      title: 'Get DueSync Tasks For A Day',
      description: 'Return pending tasks for a given local DueSync day in the authenticated user timezone.',
      inputSchema: {
        date: dateSchema.optional(),
      },
    },
    async ({ date }, extra) => {
      const result = await getTasksForDay(date, requireAuthInfo(extra));

      return asToolResult(
        `Found ${result.tasks.length} pending task${result.tasks.length === 1 ? '' : 's'} for ${result.date}.`,
        {
          user: {
            email: result.user.email,
            timezone: result.user.timezone,
          },
          date: result.date,
          total: result.tasks.length,
          tasks: result.tasks,
        }
      );
    }
  );

  server.registerTool(
    'list_categories',
    {
      title: 'List DueSync Categories',
      description: 'List categories for the authenticated DueSync user.',
    },
    async (extra) => {
      const result = await listCategories(requireAuthInfo(extra));
      const preview = result.categories.length
        ? result.categories.map((category) => `${category.name} (${category.taskCount})`).join(', ')
        : 'No categories found.';

      return asToolResult(
        preview,
        {
          user: {
            email: result.user.email,
            timezone: result.user.timezone,
          },
          total: result.categories.length,
          categories: result.categories,
        }
      );
    }
  );

  server.registerTool(
    'list_tags',
    {
      title: 'List DueSync Tags',
      description: 'List tags for the authenticated DueSync user.',
    },
    async (extra) => {
      const result = await listTags(requireAuthInfo(extra));
      const preview = result.tags.length
        ? result.tags.map((tag) => `${tag.name} (${tag.taskCount})`).join(', ')
        : 'No tags found.';

      return asToolResult(
        preview,
        {
          user: {
            email: result.user.email,
            timezone: result.user.timezone,
          },
          total: result.tags.length,
          tags: result.tags,
        }
      );
    }
  );

  server.registerTool(
    'create_task',
    {
      title: 'Create DueSync Task',
      description: 'Create a new task for the authenticated DueSync user.',
      inputSchema: createTaskToolSchema,
    },
    async (input, extra) => {
      const { userId, authInfo } = requireScopedUserId(extra, MCP_WRITE_SCOPE);
      const validatedInput = createTaskSchema.parse(input);
      const result = await createTaskForUser(userId, validatedInput);

      return asToolResult(
        summarizeTaskMutation('Created task', result.task),
        {
          user: {
            email: authInfo.extra?.userEmail,
            timezone: authInfo.extra?.timezone ?? null,
          },
          task: result.task,
        }
      );
    }
  );

  server.registerTool(
    'update_task',
    {
      title: 'Update DueSync Task',
      description: 'Update one task for the authenticated DueSync user.',
      inputSchema: {
        taskId: z.string().cuid(),
        ...updateTaskToolSchema,
      },
    },
    async ({ taskId, ...input }, extra) => {
      const { userId, authInfo } = requireScopedUserId(extra, MCP_WRITE_SCOPE);
      const validatedInput = updateTaskSchema.parse(input);
      const result = await updateTaskForUser(userId, taskId, validatedInput);

      return asToolResult(
        summarizeTaskMutation('Updated task', result.task),
        {
          user: {
            email: authInfo.extra?.userEmail,
            timezone: authInfo.extra?.timezone ?? null,
          },
          task: result.task,
          nextTask: result.nextTask,
        }
      );
    }
  );

  server.registerTool(
    'complete_task',
    {
      title: 'Complete DueSync Task',
      description: 'Mark a task as completed for the authenticated DueSync user.',
      inputSchema: {
        taskId: z.string().cuid(),
      },
    },
    async ({ taskId }, extra) => {
      const { userId, authInfo } = requireScopedUserId(extra, MCP_WRITE_SCOPE);
      const result = await completeTaskForUser(userId, taskId);

      return asToolResult(
        summarizeTaskMutation('Completed task', result.task),
        {
          user: {
            email: authInfo.extra?.userEmail,
            timezone: authInfo.extra?.timezone ?? null,
          },
          task: result.task,
          nextTask: result.nextTask,
        }
      );
    }
  );

  server.registerTool(
    'archive_task',
    {
      title: 'Archive DueSync Task',
      description: 'Archive a task for the authenticated DueSync user.',
      inputSchema: {
        taskId: z.string().cuid(),
      },
    },
    async ({ taskId }, extra) => {
      const { userId, authInfo } = requireScopedUserId(extra, MCP_WRITE_SCOPE);
      const result = await archiveTaskForUser(userId, taskId);

      return asToolResult(
        summarizeTaskMutation('Archived task', result.task),
        {
          user: {
            email: authInfo.extra?.userEmail,
            timezone: authInfo.extra?.timezone ?? null,
          },
          task: result.task,
        }
      );
    }
  );

  server.registerTool(
    'delete_task',
    {
      title: 'Delete DueSync Task',
      description: 'Delete a task for the authenticated DueSync user.',
      inputSchema: {
        taskId: z.string().cuid(),
      },
    },
    async ({ taskId }, extra) => {
      const { userId, authInfo } = requireScopedUserId(extra, MCP_WRITE_SCOPE);
      const result = await deleteTaskForUser(userId, taskId);

      return asToolResult(
        `Deleted task ${result.title}.`,
        {
          user: {
            email: authInfo.extra?.userEmail,
            timezone: authInfo.extra?.timezone ?? null,
          },
          deletedTask: result,
        }
      );
    }
  );

  server.registerTool(
    'plan_day',
    {
      title: 'Build A DueSync Day Plan',
      description: 'Create a read-only daily plan from the authenticated user task backlog and available focus time.',
      inputSchema: {
        date: dateSchema.optional(),
        availableMinutes: z.number().int().min(30).max(960).default(240),
        startTime: timeSchema.optional(),
        breakMinutes: z.number().int().min(0).max(60).default(10),
        includeBacklog: z.boolean().default(true),
        maxTasks: z.number().int().min(1).max(20).default(8),
      },
    },
    async ({ date, availableMinutes, startTime, breakMinutes, includeBacklog, maxTasks }, extra) => {
      const result = await getPendingTasksForPlanning(date, includeBacklog, requireAuthInfo(extra));
      const planned = buildDayPlan(result.tasks, {
        date: result.date,
        timezone: result.user.timezone,
        availableMinutes,
        startTime,
        breakMinutes,
        maxTasks,
      });

      return asToolResult(
        planned.summary,
        {
          user: {
            email: result.user.email,
            timezone: result.user.timezone,
          },
          sourceTaskCount: result.tasks.length,
          ...planned,
        }
      );
    }
  );

  return {
    server,
  };
}
