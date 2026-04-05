import { buildDayPlan } from '../day-plan';

const baseTask = {
  description: null,
  categoryId: null,
  googleEventId: null,
  isRecurring: false,
  recurringPattern: null,
  completedAt: null,
  updatedAt: new Date('2026-04-05T08:00:00.000Z'),
  userId: 'user-1',
  category: null,
  tags: [],
};

describe('buildDayPlan', () => {
  it('prioritizes overdue and high-priority tasks first', () => {
    const tasks: any[] = [
      {
        ...baseTask,
        id: 'task-low',
        title: 'Low priority backlog',
        dueDate: new Date('2026-04-08T09:00:00.000Z'),
        dueTime: null,
        priority: 'LOW',
        status: 'PENDING',
        estimatedTime: 30,
        createdAt: new Date('2026-04-01T08:00:00.000Z'),
      },
      {
        ...baseTask,
        id: 'task-overdue',
        title: 'Overdue high priority',
        dueDate: new Date('2026-04-03T09:00:00.000Z'),
        dueTime: '09:00',
        priority: 'HIGH',
        status: 'PENDING',
        estimatedTime: 60,
        createdAt: new Date('2026-04-02T08:00:00.000Z'),
      },
      {
        ...baseTask,
        id: 'task-today',
        title: 'Due today medium priority',
        dueDate: new Date('2026-04-05T11:00:00.000Z'),
        dueTime: '11:00',
        priority: 'MEDIUM',
        status: 'PENDING',
        estimatedTime: 45,
        createdAt: new Date('2026-04-04T08:00:00.000Z'),
      },
    ];

    const result = buildDayPlan(tasks, {
      date: '2026-04-05',
      timezone: 'Africa/Nairobi',
      availableMinutes: 180,
      startTime: '09:00',
      breakMinutes: 10,
      maxTasks: 5,
    });

    expect(result.plan.scheduled[0].taskId).toBe('task-overdue');
    expect(result.plan.scheduled[1].taskId).toBe('task-today');
    expect(result.plan.stats.overdueTasks).toBe(1);
  });

  it('creates a partial block when a useful amount of time remains', () => {
    const tasks: any[] = [
      {
        ...baseTask,
        id: 'task-long',
        title: 'Long task',
        dueDate: new Date('2026-04-05T10:00:00.000Z'),
        dueTime: '10:00',
        priority: 'HIGH',
        status: 'PENDING',
        estimatedTime: 90,
        createdAt: new Date('2026-04-04T08:00:00.000Z'),
      },
    ];

    const result = buildDayPlan(tasks, {
      date: '2026-04-05',
      timezone: 'Africa/Nairobi',
      availableMinutes: 45,
      startTime: '09:00',
      breakMinutes: 5,
      maxTasks: 3,
    });

    expect(result.plan.scheduled).toHaveLength(1);
    expect(result.plan.scheduled[0].plannedMinutes).toBe(45);
    expect(result.plan.scheduled[0].isPartialBlock).toBe(true);
  });
});
