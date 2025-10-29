import { validateCommand } from '../../middleware/commandSecurity';

describe('commandSecurity', () => {
  it('should allow safe commands', () => {
    const result = validateCommand('/view todos');
    expect(result.isValid).toBe(true);
  });

  it('should allow commands with flags', () => {
    const result = validateCommand('/add todo --title="Test"');
    expect(result.isValid).toBe(true);
  });

  it('should reject commands with shell injection', () => {
    const result = validateCommand('/view todos && rm -rf /');
    expect(result.isValid).toBe(false);
  });

  it('should reject commands with pipes', () => {
    const result = validateCommand('/view todos | cat /etc/passwd');
    expect(result.isValid).toBe(false);
  });

  it('should reject commands with backticks', () => {
    const result = validateCommand('/view todos `whoami`');
    expect(result.isValid).toBe(false);
  });

  it('should reject commands with semicolons', () => {
    const result = validateCommand('/view todos; ls');
    expect(result.isValid).toBe(false);
  });

  it('should allow normal text with special chars in quotes', () => {
    const result = validateCommand('/add todo --title="Task; with semicolon"');
    expect(result.isValid).toBe(true);
  });

  it('should reject path traversal attempts', () => {
    const result = validateCommand('/view ../../etc/passwd');
    expect(result.isValid).toBe(false);
  });

  it('should allow project mentions', () => {
    const result = validateCommand('/view todos @MyProject');
    expect(result.isValid).toBe(true);
  });

  it('should allow multi-word commands', () => {
    const result = validateCommand('/add todo Test task');
    expect(result.isValid).toBe(true);
  });
});
