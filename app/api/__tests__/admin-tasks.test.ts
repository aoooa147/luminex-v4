/**
 * Unit tests for /api/admin/tasks route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Mock scheduler before importing route
const mockRunTask = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/automation/scheduler', () => ({
  runTask: mockRunTask,
}));

// Set environment variables before importing route module
process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS = '0xadminaddress123456789012345678901234567890';
process.env.TREASURY_ADDRESS = '0xadminaddress123456789012345678901234567890';

const ADMIN_ADDRESS = '0xadminaddress123456789012345678901234567890';
const NON_ADMIN_ADDRESS = '0xnonadmin123456789012345678901234567890';

describe('/api/admin/tasks', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    // Import route after setting env vars
    const module = await import('../admin/tasks/route');
    POST = module.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRunTask.mockResolvedValue(undefined);
    // Ensure env vars are set
    process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS = ADMIN_ADDRESS;
    process.env.TREASURY_ADDRESS = ADMIN_ADDRESS;
  });

  it('should return error when user is not admin', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/tasks', {
      method: 'POST',
      body: JSON.stringify({
        taskId: 'test-task',
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': NON_ADMIN_ADDRESS,
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(403);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('UNAUTHORIZED');
  });

  it('should return error when taskId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/tasks', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': ADMIN_ADDRESS,
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('INVALID_REQUEST');
  });

  it('should execute task successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/tasks', {
      method: 'POST',
      body: JSON.stringify({
        taskId: 'test-task',
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': ADMIN_ADDRESS,
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('taskId', 'test-task');
    expect(data).toHaveProperty('message', 'Task executed successfully');

    expect(mockRunTask).toHaveBeenCalledWith('test-task');
  });

  it('should handle task execution errors', async () => {
    mockRunTask.mockRejectedValue(new Error('Task execution failed'));

    const req = new NextRequest('http://localhost:3000/api/admin/tasks', {
      method: 'POST',
      body: JSON.stringify({
        taskId: 'test-task',
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': ADMIN_ADDRESS,
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(500);

    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('INTERNAL_ERROR');
  });
});
