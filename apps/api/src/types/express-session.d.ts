import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      role: 'admin' | 'agent';
      organizationId: string;
    };
    networkAccess?: {
      status: 'connected';
      mode: 'simulated';
      connectedAt: string;
    };
  }
}
