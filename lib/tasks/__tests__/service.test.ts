import { Priority, Status } from '@prisma/client';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findFirst: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
    task: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/google-calendar', () => ({
  createCalendarEvent: jest.fn(),
  deleteCalendarEvent: jest.fn(),
  updateCalendarEvent: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  calculateNextRecurringDate: jest.fn(),
}));

import { TaskMutationError, createTaskForUser, updateTaskForUser } from '../service';

const { prisma: mockPrisma } = jest.requireMock('@/lib/prisma') as {
  prisma: {
    account: { findFirst: jest.Mock };
    category: { findFirst: jest.Mock };
    tag: { findMany: jest.Mock };
    task: {
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
};

const { calculateNextRecurringDate: mockCalculateNextRecurringDate } = jest.requireMock('@/lib/utils') as {
  calculateNextRecurringDate: jest.Mock;
};

describe('task mutation service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.account.findFirst.mockResolvedValue(null);
    mockCalculateNextRecurringDate.mockReturnValue(new Date('2026-04-10T00:00:00.000Z'));
  });

  it('rejects tag ids that do not belong to the user', async () => {
    mockPrisma.tag.findMany.mockResolvedValue([{ id: 'tag-1' }]);

    await expect(
      createTaskForUser('user-1', {
        title: 'Write MCP docs',
        dueDate: new Date('2026-04-06T00:00:00.000Z'),
        priority: Priority.MEDIUM,
        tagIds: ['tag-1', 'tag-2'],
        isRecurring: false,
      })
    ).rejects.toBeInstanceOf(TaskMutationError);

    expect(mockPrisma.task.create).not.toHaveBeenCalled();
  });

  it('does not generate a second recurring task when an already-completed recurring task is edited', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      userId: 'user-1',
      title: 'Weekly planning',
      description: null,
      dueDate: new Date('2026-04-05T00:00:00.000Z'),
      dueTime: '09:00',
      priority: Priority.HIGH,
      status: Status.COMPLETED,
      categoryId: null,
      googleEventId: null,
      isRecurring: true,
      recurringPattern: 'WEEKLY',
      estimatedTime: 60,
      completedAt: new Date('2026-04-05T08:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-05T08:00:00.000Z'),
    });

    mockPrisma.task.update.mockResolvedValue({
      id: 'task-1',
      userId: 'user-1',
      title: 'Weekly planning (updated)',
      description: null,
      dueDate: new Date('2026-04-05T00:00:00.000Z'),
      dueTime: '09:00',
      priority: Priority.HIGH,
      status: Status.COMPLETED,
      categoryId: null,
      googleEventId: null,
      isRecurring: true,
      recurringPattern: 'WEEKLY',
      estimatedTime: 60,
      completedAt: new Date('2026-04-05T08:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-05T08:05:00.000Z'),
      category: null,
      tags: [],
    });

    const result = await updateTaskForUser('user-1', 'task-1', {
      title: 'Weekly planning (updated)',
    });

    expect(result.nextTask).toBeNull();
    expect(mockPrisma.task.create).not.toHaveBeenCalled();
    expect(mockCalculateNextRecurringDate).not.toHaveBeenCalled();
  });
});
