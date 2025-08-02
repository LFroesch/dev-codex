import { AnalyticsService } from '../middleware/analytics';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export const trackFieldChanges = async (
  req: AuthenticatedRequest,
  projectId: string,
  projectName: string,
  oldData: any,
  newData: any,
  fieldPrefix: string = ''
) => {
  if (!req.userId) return;

  const changes: Array<{
    fieldName: string;
    fieldType: string;
    oldValue: any;
    newValue: any;
  }> = [];

  // Compare the objects and track changes
  for (const [key, newValue] of Object.entries(newData)) {
    const oldValue = oldData[key];
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      const fieldName = fieldPrefix ? `${fieldPrefix}.${key}` : key;
      
      changes.push({
        fieldName,
        fieldType: getFieldType(key, newValue),
        oldValue,
        newValue
      });
    }
  }

  // Track each change as a separate event
  for (const change of changes) {
    await AnalyticsService.trackEvent(
      req.userId,
      'field_edit',
      {
        projectId,
        projectName,
        ...change,
        metadata: {
          endpoint: req.path,
          method: req.method,
          userAgent: req.headers['user-agent']
        }
      },
      req
    );
  }

  return changes;
};

export const trackArrayChanges = async (
  req: AuthenticatedRequest,
  projectId: string,
  projectName: string,
  oldArray: any[],
  newArray: any[],
  arrayName: string,
  action: 'add' | 'update' | 'delete',
  itemId?: string
) => {
  if (!req.userId) return;

  const eventData = {
    projectId,
    projectName,
    fieldName: arrayName,
    fieldType: 'array',
    oldValue: oldArray?.length || 0,
    newValue: newArray?.length || 0,
    metadata: {
      action,
      itemId,
      endpoint: req.path,
      method: req.method
    }
  };

  await AnalyticsService.trackEvent(
    req.userId,
    'field_edit',
    eventData,
    req
  );
};

const getFieldType = (fieldName: string, value: any): string => {
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object' && value !== null) return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    // Detect specific field types based on name patterns
    if (fieldName.toLowerCase().includes('email')) return 'email';
    if (fieldName.toLowerCase().includes('url') || fieldName.toLowerCase().includes('link')) return 'url';
    if (fieldName.toLowerCase().includes('color')) return 'color';
    if (fieldName.toLowerCase().includes('date') || fieldName.toLowerCase().includes('time')) return 'date';
    if (fieldName.toLowerCase().includes('description') || fieldName.toLowerCase().includes('content')) return 'text_long';
    if (value.length > 100) return 'text_long';
    return 'text_short';
  }
  return 'unknown';
};