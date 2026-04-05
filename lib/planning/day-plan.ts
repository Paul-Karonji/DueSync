import { Priority } from '@prisma/client';
import { differenceInCalendarDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

import type { TaskRecord } from '../mcp/data';

const DEFAULT_TASK_MINUTES = 45;
const MIN_PARTIAL_BLOCK_MINUTES = 25;

const PRIORITY_SCORE: Record<Priority, number> = {
  HIGH: 100,
  MEDIUM: 65,
  LOW: 35,
};

export interface DayPlanOptions {
  date: string;
  timezone: string;
  availableMinutes: number;
  startTime?: string;
  breakMinutes?: number;
  maxTasks?: number;
}

export interface ScheduledPlanItem {
  taskId: string;
  title: string;
  priority: Priority;
  dueDate: string;
  dueTime: string | null;
  plannedMinutes: number;
  estimatedMinutes: number | null;
  isPartialBlock: boolean;
  score: number;
  reasons: string[];
  category: string | null;
  tags: string[];
  startTime: string | null;
  endTime: string | null;
}

export interface DayPlan {
  date: string;
  timezone: string;
  availableMinutes: number;
  usedMinutes: number;
  breakMinutes: number;
  selectedTaskCount: number;
  remainingTaskCount: number;
  scheduled: ScheduledPlanItem[];
  unscheduled: {
    taskId: string;
    title: string;
    estimatedMinutes: number | null;
    reason: string;
  }[];
  stats: {
    overdueTasks: number;
    dueTodayTasks: number;
    dueThisWeekTasks: number;
    tasksWithoutEstimate: number;
  };
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
}

function formatMinutesAsTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function isoDayKey(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

function dayDifference(targetDate: Date, planDate: string, timezone: string) {
  const [planYear, planMonth, planDay] = planDate.split('-').map(Number);
  const [targetYear, targetMonth, targetDay] = isoDayKey(targetDate, timezone)
    .split('-')
    .map(Number);

  return differenceInCalendarDays(
    new Date(Date.UTC(targetYear, targetMonth - 1, targetDay)),
    new Date(Date.UTC(planYear, planMonth - 1, planDay))
  );
}

function estimateMinutes(task: TaskRecord) {
  return task.estimatedTime ?? DEFAULT_TASK_MINUTES;
}

function getReasons(task: TaskRecord, dayDelta: number) {
  const reasons = [`${task.priority.toLowerCase()} priority`];

  if (dayDelta < 0) {
    reasons.push(`overdue by ${Math.abs(dayDelta)} day${Math.abs(dayDelta) === 1 ? '' : 's'}`);
  } else if (dayDelta === 0) {
    reasons.push('due today');
  } else if (dayDelta === 1) {
    reasons.push('due tomorrow');
  } else if (dayDelta <= 7) {
    reasons.push('due this week');
  }

  if (!task.estimatedTime) {
    reasons.push('missing estimate, using default 45m block');
  }

  if (task.isRecurring) {
    reasons.push('recurring task');
  }

  return reasons;
}

function scoreTask(task: TaskRecord, planDate: string, timezone: string) {
  const dueDate = new Date(task.dueDate);
  const delta = dayDifference(dueDate, planDate, timezone);
  const reasons = getReasons(task, delta);
  let score = PRIORITY_SCORE[task.priority];

  if (delta < 0) {
    score += 140 + (Math.abs(delta) * 10);
  } else if (delta === 0) {
    score += 110;
  } else if (delta === 1) {
    score += 70;
  } else if (delta <= 3) {
    score += 40;
  } else if (delta <= 7) {
    score += 20;
  }

  const minutes = estimateMinutes(task);
  score += Math.max(5, 35 - Math.floor(minutes / 15) * 4);

  if (task.dueTime) {
    score += 5;
  }

  if (task.isRecurring) {
    score += 5;
  }

  return {
    task,
    score,
    delta,
    reasons,
    plannedMinutes: minutes,
  };
}

function buildNarrative(plan: DayPlan) {
  if (plan.scheduled.length === 0) {
    return `No tasks fit into the requested ${plan.availableMinutes} minute planning window.`;
  }

  const firstItem = plan.scheduled[0];
  const summary = [
    `Planned ${plan.scheduled.length} task${plan.scheduled.length === 1 ? '' : 's'}`,
    `using ${plan.usedMinutes}/${plan.availableMinutes} minutes`,
    `for ${plan.date} (${plan.timezone})`,
  ];

  const headline = `Top focus: ${firstItem.title} (${firstItem.reasons.join(', ')}).`;
  const backlog = plan.stats.overdueTasks
    ? `There ${plan.stats.overdueTasks === 1 ? 'is' : 'are'} ${plan.stats.overdueTasks} overdue task${plan.stats.overdueTasks === 1 ? '' : 's'} in scope.`
    : 'No overdue tasks are in scope.';

  return `${summary.join(' ')}. ${headline} ${backlog}`;
}

export function buildDayPlan(tasks: TaskRecord[], options: DayPlanOptions) {
  const scoredTasks = tasks
    .map((task) => scoreTask(task, options.date, options.timezone))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.task.dueDate.getTime() !== right.task.dueDate.getTime()) {
        return left.task.dueDate.getTime() - right.task.dueDate.getTime();
      }

      if ((left.task.dueTime || '23:59') !== (right.task.dueTime || '23:59')) {
        return (left.task.dueTime || '23:59').localeCompare(right.task.dueTime || '23:59');
      }

      return left.task.createdAt.getTime() - right.task.createdAt.getTime();
    });

  const scheduled: ScheduledPlanItem[] = [];
  const unscheduled: DayPlan['unscheduled'] = [];
  const maxTasks = options.maxTasks ?? 8;
  const breakMinutes = options.breakMinutes ?? 10;
  let usedMinutes = 0;
  let cursorMinutes = options.startTime ? parseTimeToMinutes(options.startTime) : null;

  for (const scoredTask of scoredTasks) {
    const remainingMinutes = options.availableMinutes - usedMinutes;

    if (scheduled.length >= maxTasks) {
      unscheduled.push({
        taskId: scoredTask.task.id,
        title: scoredTask.task.title,
        estimatedMinutes: scoredTask.task.estimatedTime,
        reason: `Skipped because the plan hit the max task limit of ${maxTasks}.`,
      });
      continue;
    }

    if (remainingMinutes <= 0) {
      unscheduled.push({
        taskId: scoredTask.task.id,
        title: scoredTask.task.title,
        estimatedMinutes: scoredTask.task.estimatedTime,
        reason: 'Skipped because no planning time remains.',
      });
      continue;
    }

    let plannedMinutes = scoredTask.plannedMinutes;
    let isPartialBlock = false;

    if (plannedMinutes > remainingMinutes) {
      if (remainingMinutes < MIN_PARTIAL_BLOCK_MINUTES) {
        unscheduled.push({
          taskId: scoredTask.task.id,
          title: scoredTask.task.title,
          estimatedMinutes: scoredTask.task.estimatedTime,
          reason: `Skipped because only ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} remained, which is too short for a useful focus block.`,
        });
        continue;
      }

      plannedMinutes = remainingMinutes;
      isPartialBlock = true;
    }

    const startTime = cursorMinutes === null ? null : formatMinutesAsTime(cursorMinutes);
    const endTime = cursorMinutes === null ? null : formatMinutesAsTime(cursorMinutes + plannedMinutes);

    scheduled.push({
      taskId: scoredTask.task.id,
      title: scoredTask.task.title,
      priority: scoredTask.task.priority,
      dueDate: scoredTask.task.dueDate.toISOString(),
      dueTime: scoredTask.task.dueTime,
      plannedMinutes,
      estimatedMinutes: scoredTask.task.estimatedTime,
      isPartialBlock,
      score: scoredTask.score,
      reasons: scoredTask.reasons,
      category: scoredTask.task.category?.name ?? null,
      tags: scoredTask.task.tags.map((entry) => entry.tag.name),
      startTime,
      endTime,
    });

    usedMinutes += plannedMinutes;

    if (cursorMinutes !== null) {
      cursorMinutes += plannedMinutes + breakMinutes;
    }
  }

  const plan: DayPlan = {
    date: options.date,
    timezone: options.timezone,
    availableMinutes: options.availableMinutes,
    usedMinutes,
    breakMinutes,
    selectedTaskCount: scheduled.length,
    remainingTaskCount: unscheduled.length,
    scheduled,
    unscheduled,
    stats: {
      overdueTasks: scoredTasks.filter((task) => task.delta < 0).length,
      dueTodayTasks: scoredTasks.filter((task) => task.delta === 0).length,
      dueThisWeekTasks: scoredTasks.filter((task) => task.delta >= 0 && task.delta <= 7).length,
      tasksWithoutEstimate: scoredTasks.filter((task) => !task.task.estimatedTime).length,
    },
  };

  return {
    summary: buildNarrative(plan),
    plan,
  };
}
