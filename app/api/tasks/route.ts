// API route for tasks - GET (fetch all) & POST (create)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createTaskSchema, taskQuerySchema } from '@/lib/validations/task';
import { Status, Priority } from '@prisma/client';
import { createTaskForUser, TaskMutationError } from '@/lib/tasks/service';

// GET /api/tasks - Fetch all tasks with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      tagId: searchParams.get('tagId') || undefined,
      search: searchParams.get('search') || undefined,
      date: searchParams.get('date') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    // Validate query params
    const validatedQuery = taskQuerySchema.parse(queryData);

    // Build where clause
    const where: any = {
      userId,
    };

    if (validatedQuery.status) {
      where.status = validatedQuery.status as Status;
    }

    if (validatedQuery.priority) {
      where.priority = validatedQuery.priority as Priority;
    }

    if (validatedQuery.categoryId) {
      where.categoryId = validatedQuery.categoryId;
    }

    if (validatedQuery.tagId) {
      where.tags = {
        some: {
          tagId: validatedQuery.tagId,
        },
      };
    }

    if (validatedQuery.search) {
      where.OR = [
        { title: { contains: validatedQuery.search, mode: 'insensitive' } },
        { description: { contains: validatedQuery.search, mode: 'insensitive' } },
      ];
    }

    if (validatedQuery.date) {
      const date = new Date(validatedQuery.date);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      where.dueDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (validatedQuery.startDate && validatedQuery.endDate) {
      where.dueDate = {
        gte: new Date(validatedQuery.startDate),
        lte: new Date(validatedQuery.endDate),
      };
    }

    // Fetch tasks with pagination
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // PENDING first, then COMPLETED, then ARCHIVED
          { dueDate: 'asc' }, // Earliest due date first
          { priority: 'asc' }, // HIGH first (enum order: HIGH=0, MEDIUM=1, LOW=2)
        ],
        skip: (validatedQuery.page - 1) * validatedQuery.limit,
        take: validatedQuery.limit,
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      tasks,
      total,
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      totalPages: Math.ceil(total / validatedQuery.limit),
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('GET /api/tasks error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const body = await request.json();

    // Validate request body
    const validatedData = createTaskSchema.parse(body);
    const { task } = await createTaskForUser(userId, validatedData);

    // Return immediately without waiting for calendar sync
    return NextResponse.json(
      {
        success: true,
        task,
        message: 'Task created successfully',
      },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('POST /api/tasks error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof TaskMutationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}
