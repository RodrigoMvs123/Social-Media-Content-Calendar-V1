declare module './auth-routes' {
    import { Router } from 'express';
    const router: Router;
    export default router;
}

declare module './media-routes' {
    import { Router } from 'express';
    const router: Router;
    export default router;
}

declare module './auth-routes-sqlite' {
    import { Router } from 'express';
    const router: Router;
    export default router;
}

declare module './posts-routes-sqlite' {
    import { Router } from 'express';
    const router: Router;
    export default router;
}

declare module './analytics-routes-sqlite' {
    import { Router } from 'express';
    const router: Router;
    export default router;
}

declare module './slack-routes' {
    import { Router } from 'express';
    const router: Router;
    export default router;
}

declare module './notification-routes' {
    import { Router } from 'express';
    const router: Router;
    export default router;
}

declare module './posts-routes' {
    import { Router } from 'express';
    const router: Router;
    export default router;
}

declare module './post-scheduler' {
    export function startPostScheduler(): void;
}
