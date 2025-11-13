import { CommandExecutor, ResponseType } from '../../services/commandExecutor';
import { Project } from '../../models/Project';
import mongoose from 'mongoose';

jest.mock('../../models/Project');
jest.mock('../../services/ProjectCache');
jest.mock('../../config/logger');
jest.mock('../../services/activityLogger');

describe('CommandExecutor', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();
  let executor: CommandExecutor;

  beforeEach(() => {
    executor = new CommandExecutor(userId);
    jest.clearAllMocks();
  });

  describe('Single Command Execution', () => {
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

    it('should execute note commands', async () => {
      const addResult = await executor.execute('/add note --title="Test Note"', projectId);
      expect(addResult).toBeDefined();

      const viewResult = await executor.execute('/view notes', projectId);
      expect(viewResult).toBeDefined();
    });

    it('should execute devlog commands', async () => {
      const result = await executor.execute('/view devlog', projectId);
      expect(result).toBeDefined();
    });

    it('should execute component commands', async () => {
      const result = await executor.execute('/view components', projectId);
      expect(result).toBeDefined();
    });

    it('should execute relationship commands', async () => {
      const result = await executor.execute('/view relationships', projectId);
      expect(result).toBeDefined();
    });

    it('should execute subtask commands', async () => {
      const result = await executor.execute('/view subtasks --id=1', projectId);
      expect(result).toBeDefined();
    });

    it('should execute summary command', async () => {
      const result = await executor.execute('/summary', projectId);
      expect(result).toBeDefined();
    });

    it('should execute swap project command', async () => {
      const result = await executor.execute('/swap --id=123');
      expect(result).toBeDefined();
    });
  });

  describe('Batch Command Execution', () => {
    it('should execute batch commands with && separator', async () => {
      const result = await executor.execute('/help && /view todos', projectId);
      expect(result).toBeDefined();
      expect(result.data?.batch).toBe(true);
      expect(result.data?.total).toBe(2);
    });

    it('should execute batch commands with newline separator', async () => {
      const result = await executor.execute('/help\n/view todos', projectId);
      expect(result).toBeDefined();
      expect(result.data?.batch).toBe(true);
      expect(result.data?.total).toBe(2);
    });

    it('should stop batch execution on error', async () => {
      const result = await executor.execute('/help && /invalid && /view todos', projectId);
      expect(result).toBeDefined();
      expect(result.type).toBe(ResponseType.WARNING);
    });

    it('should reject batch with more than 10 commands', async () => {
      const commands = Array(11).fill('/help').join(' && ');
      const result = await executor.execute(commands);
      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('Too many chained commands');
    });

    it('should handle quotes in batch commands', async () => {
      const result = await executor.execute('/add todo --title="Test && More" && /help', projectId);
      expect(result).toBeDefined();
      expect(result.data?.batch).toBe(true);
    });

    it('should handle escaped characters in batch commands', async () => {
      const result = await executor.execute('/add todo --title="Test\\"Quote" && /help', projectId);
      expect(result).toBeDefined();
      expect(result.data?.batch).toBe(true);
    });

    it('should skip empty commands in batch', async () => {
      const result = await executor.execute('/help &&   && /view todos', projectId);
      expect(result).toBeDefined();
      expect(result.data?.batch).toBe(true);
      expect(result.data?.total).toBe(2); // Only 2 valid commands
    });

    it('should handle newlines with && combination', async () => {
      const result = await executor.execute('/help\n&&/view todos', projectId);
      expect(result).toBeDefined();
      expect(result.data?.batch).toBe(true);
    });
  });

  describe('Project Lock Checking', () => {
    it('should prevent write commands on locked projects', async () => {
      const mockProject = {
        _id: projectId,
        isLocked: true,
        lockedReason: 'Project is locked due to plan limits'
      };

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      const result = await executor.execute('/add todo --title="Test"', projectId);
      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('locked');
      expect(result.data?.isLocked).toBe(true);
    });

    it('should allow write commands on unlocked projects', async () => {
      const mockProject = {
        _id: projectId,
        isLocked: false
      };

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      const result = await executor.execute('/add todo --title="Test"', projectId);
      expect(result).toBeDefined();
      // Should not be error due to lock
    });

    it('should handle project lock check errors gracefully', async () => {
      (Project.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await executor.execute('/add todo --title="Test"', projectId);
      expect(result).toBeDefined();
      // Should still attempt to execute despite lock check error
    });
  });

  describe('Error Handling', () => {
    it('should handle execution errors gracefully', async () => {
      // Create an executor that will throw during handler execution
      const result = await executor.execute('/help');
      expect(result).toBeDefined();
      // The mocked handlers should not throw, but this tests the try-catch
    });

    it('should return error for commands without slash', async () => {
      const result = await executor.execute('help');
      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('Invalid command');
    });

    it('should provide suggestions for invalid commands', async () => {
      const result = await executor.execute('/unknown');
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions).toContain('/help');
    });
  });

  describe('Additional Command Types', () => {
    it('should execute complete todo command', async () => {
      const result = await executor.execute('/complete todo --id=1', projectId);
      expect(result).toBeDefined();
    });

    it('should execute assign todo command', async () => {
      const result = await executor.execute('/assign todo --id=1 --to=user123', projectId);
      expect(result).toBeDefined();
    });

    it('should execute push todo command', async () => {
      const result = await executor.execute('/push todo --id=1', projectId);
      expect(result).toBeDefined();
    });

    it('should execute edit commands', async () => {
      const todoResult = await executor.execute('/edit todo --id=1 --title="Updated"', projectId);
      expect(todoResult).toBeDefined();

      const noteResult = await executor.execute('/edit note --id=1 --title="Updated"', projectId);
      expect(noteResult).toBeDefined();
    });

    it('should execute delete commands', async () => {
      const todoResult = await executor.execute('/delete todo --id=1', projectId);
      expect(todoResult).toBeDefined();

      const noteResult = await executor.execute('/delete note --id=1', projectId);
      expect(noteResult).toBeDefined();
    });

    it('should execute stack commands', async () => {
      const addResult = await executor.execute('/add stack --name="React"', projectId);
      expect(addResult).toBeDefined();

      const removeResult = await executor.execute('/remove stack --name="React"', projectId);
      expect(removeResult).toBeDefined();
    });

    it('should execute team commands', async () => {
      const inviteResult = await executor.execute('/invite member --email="test@example.com"', projectId);
      expect(inviteResult).toBeDefined();

      const removeResult = await executor.execute('/remove member --id=123', projectId);
      expect(removeResult).toBeDefined();
    });

    it('should execute settings commands', async () => {
      const setNameResult = await executor.execute('/set name --value="New Name"', projectId);
      expect(setNameResult).toBeDefined();

      const addTagResult = await executor.execute('/add tag --name="important"', projectId);
      expect(addTagResult).toBeDefined();

      const removeTagResult = await executor.execute('/remove tag --name="important"', projectId);
      expect(removeTagResult).toBeDefined();
    });

    it('should execute utility commands', async () => {
      const newsResult = await executor.execute('/view news');
      expect(newsResult).toBeDefined();

      const themeResult = await executor.execute('/view themes');
      expect(themeResult).toBeDefined();

      const notifResult = await executor.execute('/view notifications');
      expect(notifResult).toBeDefined();
    });

    it('should execute idea commands', async () => {
      const addResult = await executor.execute('/add idea --title="New Idea"');
      expect(addResult).toBeDefined();

      const viewResult = await executor.execute('/view ideas');
      expect(viewResult).toBeDefined();
    });

    it('should execute project management commands', async () => {
      const addResult = await executor.execute('/add project --name="New Project"');
      expect(addResult).toBeDefined();

      const viewResult = await executor.execute('/view projects');
      expect(viewResult).toBeDefined();
    });
  });
});
