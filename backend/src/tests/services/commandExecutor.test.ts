import { CommandExecutor } from '../../services/commandExecutor';

jest.mock('../../models/Project');
jest.mock('../../services/ProjectCache');
jest.mock('../../config/logger');
jest.mock('../../services/activityLogger');

describe('commandExecutor', () => {
  const userId = 'user123';
  const projectId = 'proj123';
  let executor: CommandExecutor;

  beforeEach(() => {
    executor = new CommandExecutor(userId);
  });

  it('should execute add todo command', async () => {
    const result = await executor.execute('/add todo --title="Test"', projectId);
    expect(result).toBeDefined();
    expect(result.type).toBeDefined();
  });

  it('should execute view todos command', async () => {
    const result = await executor.execute('/view todos', projectId);
    expect(result).toBeDefined();
  });

  it('should execute search command', async () => {
    const result = await executor.execute('/search test', projectId);
    expect(result).toBeDefined();
  });

  it('should execute help command', async () => {
    const result = await executor.execute('/help');
    expect(result).toBeDefined();
  });

  it('should handle invalid commands', async () => {
    const result = await executor.execute('/invalid');
    expect(result).toBeDefined();
    expect(result.type).toBe('error');
  });

  it('should handle missing slash', async () => {
    const result = await executor.execute('add todo test');
    expect(result.type).toBe('error');
  });

  it('should execute view settings', async () => {
    const result = await executor.execute('/view settings', projectId);
    expect(result).toBeDefined();
  });

  it('should execute view team', async () => {
    const result = await executor.execute('/view team', projectId);
    expect(result).toBeDefined();
  });

  it('should execute view stack', async () => {
    const result = await executor.execute('/view stack', projectId);
    expect(result).toBeDefined();
  });

  it('should execute export command', async () => {
    const result = await executor.execute('/export', projectId);
    expect(result).toBeDefined();
  });
});
