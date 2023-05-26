import 'reflect-metadata';
import { Cron, Expression, initCronJobs } from '@reflet/cron';
import { logger } from '@app/common/logger';
import { getCommitHash } from '@app/common/get-commit-hash';
import fetch from 'node-fetch';

@Cron.UtcOffset(0)
@Cron.Retry({ attempts: 2, delay: 1000 })
class Jobs {
    @Cron(Expression.EVERY_30_SECONDS)
    async fetchNewPosts() {
        const results = await (await fetch('https://www.reddit.com/r/all.json?sort=new&limit=100', {
            headers: {
                'User-Agent': `epoch:${getCommitHash()} (by /u/ImLunaHey)`
            }
        })).json() as { data: { children: Record<string, unknown>[] } };
        for (const result of results.data.children) {
            logger.info('result', result);
        }
    }

    @Cron(Expression.EVERY_30_SECONDS)
    async fetchNewComments() {
        const results = await (await fetch('https://www.reddit.com/r/all/comments.json?sort=new&limit=100', {
            headers: {
                'User-Agent': `epoch:${getCommitHash()} (by /u/ImLunaHey)`
            }
        })).json() as { data: { children: Record<string, unknown>[] } };
        for (const result of results.data.children) {
            logger.info('result', result);
        }
    }
}

// eslint-disable-next-line @typescript-eslint/require-await
export const main = async () => {
    logger.info('Application started');

    // Start jobs
    const jobs = initCronJobs(Jobs)
    jobs.startAll();
};
