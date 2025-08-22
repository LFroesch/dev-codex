import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';

export interface RouteConfig {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  requireAuth?: boolean;
}

export class BaseRouter {
  protected router: Router;
  protected basePath: string;

  constructor(basePath = '') {
    this.router = Router();
    this.basePath = basePath;
    this.setupRoutes();
  }

  protected setupRoutes(): void {
    // Override in subclasses to define routes
  }

  protected route(config: RouteConfig): void {
    const { method, path, handler, middleware = [], requireAuth = true } = config;
    const fullPath = this.basePath + path;
    
    const allMiddleware = [];
    
    if (requireAuth) {
      allMiddleware.push(requireAuth);
    }
    
    allMiddleware.push(...middleware);
    
    this.router[method](fullPath, ...allMiddleware, this.asyncWrapper(handler));
  }

  private asyncWrapper(fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) {
    return (req: Request, res: Response, next: NextFunction) => {
      const result = fn(req, res, next);
      if (result instanceof Promise) {
        result.catch(next);
      }
    };
  }

  protected sendSuccess(res: Response, data: any, message = 'Success'): void {
    res.json({
      success: true,
      message,
      ...data
    });
  }

  protected sendError(res: Response, message: string, statusCode = 400): void {
    res.status(statusCode).json({
      success: false,
      message
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}

export default BaseRouter;