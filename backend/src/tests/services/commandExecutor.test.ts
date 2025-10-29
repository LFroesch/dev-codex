import { executeCommand } from '../../services/commandExecutor';

jest.mock('../../models/Project');
jest.mock('../../services/ProjectCache');
jest.mock('../../config/logger');
jest.mock('../../services/activityLogger');

describe('commandExecutor', () => {
  const userId = 'user123';
  const projectId = 'proj123';

  it('should execute add todo command', async () => {
    const result = await executeCommand('/add todo --title="Test"', userId, projectId);
    expect(result).toBeDefined();
    expect(result.type).toBeDefined();
  });

  it('should execute view todos command', async () => {
    const result = await executeCommand('/view todos', userId, projectId);
    expect(result).toBeDefined();
  });

  it('should execute search command', async () => {
    const result = await executeCommand('/search test', userId, projectId);
    expect(result).toBeDefined();
  });

  it('should execute help command', async () => {
    const result = await executeCommand('/help', userId);
    expect(result).toBeDefined();
  });

  it('should handle invalid commands', async () => {
    const result = await executeCommand('/invalid', userId);
    expect(result).toBeDefined();
    expect(result.type).toBe('error');
  });

  it('should handle missing slash', async () => {
    const result = await executeCommand('add todo test', userId);
    expect(result.type).toBe('error');
  });

  it('should execute view settings', async () => {
    const result = await executeCommand('/view settings', userId, projectId);
    expect(result).toBeDefined();
  });

  it('should execute view team', async () => {
    const result = await executeCommand('/view team', userId, projectId);
    expect(result).toBeDefined();
  });

  it('should execute view stack', async () => {
    const result = await executeCommand('/view stack', userId, projectId);
    expect(result).toBeDefined();
  });

  it('should execute export command', async () => {
    const result = await executeCommand('/export', userId, projectId);
    expect(result).toBeDefined();
  });
});
