import 'reflect-metadata';
import { Cron, Expression, initCronJobs } from '@reflet/cron';
import { logger } from '@app/common/logger';
import { getCommitHash } from '@app/common/get-commit-hash';
import fetch from 'node-fetch';

@Cron.RunOnInit()
@Cron.UtcOffset(0)
@Cron.Retry({ attempts: 2, delay: 1000 })
class Jobs {
    async fetch(endpoint: string) {
        try {
            const response = await fetch(endpoint, {
                headers: {
                    'User-Agent': `epoch:${getCommitHash()} (by /u/ImLunaHey)`
                }
            });

            logger.info('rate-limit', {
                endpoint,
                remaining: response.headers.get('x-ratelimit-remaining'),
                reset: response.headers.get('x-ratelimit-reset'),
                used: response.headers.get('x-ratelimit-used'),
            });

            const results = await response.json() as { data: { children: Record<string, { kind: 't1' | 't3'; media_metadata?: unknown; }>[]; } };

            for (const result of results.data.children) {
                // Stringify to avoid hitting axiom's field limit
                if (Object.keys(result.data).includes('media_metadata')) result.data.media_metadata = JSON.stringify(result.data.media_metadata);
                logger.info('result', result);
            }
        } catch (error: unknown) {
            logger.error('error', {
                error,
            });
        }
    }

    @Cron(Expression.EVERY_30_SECONDS)
    async fetchNewPosts() {
        await this.fetch('https://www.reddit.com/r/all.json?sort=new&limit=100');
    }

    @Cron(Expression.EVERY_30_SECONDS)
    async fetchNewComments() {
        await this.fetch('https://www.reddit.com/r/all/comments.json?sort=new&limit=100');
    }
}

// eslint-disable-next-line @typescript-eslint/require-await
export const main = async () => {
    logger.info('Application started');

    // Start jobs
    const jobs = initCronJobs(Jobs)
    jobs.startAll();
};
