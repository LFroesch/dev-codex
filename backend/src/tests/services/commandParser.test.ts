import { CommandParser, CommandType, getFlag, getFlagCount, hasFlag } from '../../services/commandParser';

describe('CommandParser', () => {
  describe('parse', () => {
    it('should parse add todo command', () => {
      const result = CommandParser.parse('/add todo Task 1');
      expect(result.type).toBe(CommandType.ADD_TODO);
      expect(result.command).toBe('add todo');
      expect(result.args).toEqual(['Task', '1']);
      expect(result.isValid).toBe(true);
    });

    it('should parse flags', () => {
      const result = CommandParser.parse('/add todo --title="My Task" --priority=high');
      expect(result.type).toBe(CommandType.ADD_TODO);
      expect(getFlag(result.flags, 'title')).toBe('My Task');
      expect(getFlag(result.flags, 'priority')).toBe('high');
    });

    it('should parse project mentions', () => {
      const result = CommandParser.parse('/view todos @MyProject');
      expect(result.type).toBe(CommandType.VIEW_TODOS);
      expect(result.projectMention).toBe('MyProject');
    });

    it('should handle quoted strings', () => {
      const result = CommandParser.parse('/add note "This is a note with spaces"');
      expect(result.args).toContain('This is a note with spaces');
    });

    it('should error on missing leading slash', () => {
      const result = CommandParser.parse('add todo Task');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Commands must start with /');
    });

    it('should parse view commands', () => {
      const result = CommandParser.parse('/view notes');
      expect(result.type).toBe(CommandType.VIEW_NOTES);
    });

    it('should parse edit commands', () => {
      const result = CommandParser.parse('/edit todo 1');
      expect(result.type).toBe(CommandType.EDIT_TODO);
      expect(result.args).toEqual(['1']);
    });

    it('should parse delete commands', () => {
      const result = CommandParser.parse('/delete note 2');
      expect(result.type).toBe(CommandType.DELETE_NOTE);
    });

    it('should parse search command', () => {
      const result = CommandParser.parse('/search authentication');
      expect(result.type).toBe(CommandType.SEARCH);
      expect(result.args).toEqual(['authentication']);
    });

    it('should parse help command', () => {
      const result = CommandParser.parse('/help');
      expect(result.type).toBe(CommandType.HELP);
    });

    it('should handle unknown commands', () => {
      const result = CommandParser.parse('/invalid command');
      expect(result.type).toBe(CommandType.UNKNOWN);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should parse boolean flags', () => {
      const result = CommandParser.parse('/add todo --urgent --priority=high');
      expect(hasFlag(result.flags, 'urgent')).toBe(true);
      expect(getFlag(result.flags, 'priority')).toBe('high');
    });

    it('should parse multiple args', () => {
      const result = CommandParser.parse('/add todo Task with multiple words');
      expect(result.args).toEqual(['Task', 'with', 'multiple', 'words']);
    });

    it('should handle escaped quotes', () => {
      const result = CommandParser.parse('/add note "Quote: \\"Hello\\""');
      expect(result.args[0]).toContain('Hello');
    });

    it('should parse add component', () => {
      const result = CommandParser.parse('/add component');
      expect(result.type).toBe(CommandType.ADD_COMPONENT);
    });

    it('should parse add devlog', () => {
      const result = CommandParser.parse('/add devlog');
      expect(result.type).toBe(CommandType.ADD_DEVLOG);
    });

    it('should parse view stack', () => {
      const result = CommandParser.parse('/view stack');
      expect(result.type).toBe(CommandType.VIEW_STACK);
    });

    it('should parse team commands', () => {
      const result = CommandParser.parse('/view team');
      expect(result.type).toBe(CommandType.VIEW_TEAM);
    });

    it('should parse invite command', () => {
      const result = CommandParser.parse('/invite user@example.com');
      expect(result.type).toBe(CommandType.INVITE_MEMBER);
    });

    it('should parse settings commands', () => {
      const result = CommandParser.parse('/view settings');
      expect(result.type).toBe(CommandType.VIEW_SETTINGS);
    });

    it('should parse set name', () => {
      const result = CommandParser.parse('/set name New Project Name');
      expect(result.type).toBe(CommandType.SET_NAME);
    });

    it('should parse add tag', () => {
      const result = CommandParser.parse('/add tag react');
      expect(result.type).toBe(CommandType.ADD_TAG);
    });

    it('should parse complete todo', () => {
      const result = CommandParser.parse('/complete todo 1');
      expect(result.type).toBe(CommandType.COMPLETE_TODO);
    });

    it('should parse assign todo', () => {
      const result = CommandParser.parse('/assign todo 1');
      expect(result.type).toBe(CommandType.ASSIGN_TODO);
    });

    it('should parse relationship commands', () => {
      const result = CommandParser.parse('/add relationship');
      expect(result.type).toBe(CommandType.ADD_RELATIONSHIP);
    });

    it('should parse export command', () => {
      const result = CommandParser.parse('/export');
      expect(result.type).toBe(CommandType.EXPORT);
    });

    it('should parse summary command', () => {
      const result = CommandParser.parse('/summary');
      expect(result.type).toBe(CommandType.SUMMARY);
    });
  });

  describe('helper functions', () => {
    it('should get flag from Map', () => {
      const flags = new Map([['key', 'value']]);
      expect(getFlag(flags, 'key')).toBe('value');
    });

    it('should get flag from Record', () => {
      const flags = { key: 'value' };
      expect(getFlag(flags, 'key')).toBe('value');
    });

    it('should get flag count from Map', () => {
      const flags = new Map([['a', '1'], ['b', '2']]);
      expect(getFlagCount(flags)).toBe(2);
    });

    it('should get flag count from Record', () => {
      const flags = { a: '1', b: '2' };
      expect(getFlagCount(flags)).toBe(2);
    });

    it('should check flag existence in Map', () => {
      const flags = new Map([['exists', 'yes']]);
      expect(hasFlag(flags, 'exists')).toBe(true);
      expect(hasFlag(flags, 'missing')).toBe(false);
    });

    it('should check flag existence in Record', () => {
      const flags = { exists: 'yes' };
      expect(hasFlag(flags, 'exists')).toBe(true);
      expect(hasFlag(flags, 'missing')).toBe(false);
    });
  });
});
