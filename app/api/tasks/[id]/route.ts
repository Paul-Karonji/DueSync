// API route for individual tasks - PATCH (update) & DELETE

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { updateTaskSchema, taskIdSchema } from '@/lib/validations/task';
import {
  deleteTaskForUser,
  TaskMutationError,
  updateTaskForUser,
} from '@/lib/tasks/service';

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const { id } = await params;

    // Validate task ID
    taskIdSchema.parse({ id });

    const body = await request.json();

    // Validate request body
    const validatedData = updateTaskSchema.parse(body);
    const { task, nextTask } = await updateTaskForUser(userId, id, validatedData);

    return NextResponse.json({
      success: true,
      task,
      nextTask, // Include the generated next task if any
      message: 'Task updated successfully',
    });
  } catch (error: any) {
    console.error('PATCH /api/tasks/[id] error:', error);

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
      { success: false, error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const { id } = await params;

    // Validate task ID
    taskIdSchema.parse({ id });
    await deleteTaskForUser(userId, id);

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error: any) {
    console.error('DELETE /api/tasks/[id] error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof TaskMutationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}

// GET /api/tasks/[id] - Get a single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const { id } = await params;

    // Validate task ID
    taskIdSchema.parse({ id });

    // Fetch task
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    if (task.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error: any) {
    console.error('GET /api/tasks/[id] error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch task' },
      { status: 500 }
    );
  }
}
