import 'reflect-metadata';
import { Cron, Expression, initCronJobs } from '@reflet/cron';
import { logger } from '@app/common/logger';
import { getCommitHash } from '@app/common/get-commit-hash';
import Snoowrap from 'snoowrap';
import { env } from '@app/common/env';

const client = new Snoowrap({
    userAgent: `epoch:${getCommitHash()} (by /u/ImLunaHey)`,
    clientId: env.CLIENT_ID,
    clientSecret: env.CLIENT_SECRET,
    refreshToken: env.REFRESH_TOKEN,
});

@Cron.RunOnInit()
@Cron.UtcOffset(0)
@Cron.Retry({ attempts: 2, delay: 1000 })
class Jobs {
    @Cron(Expression.EVERY_30_SECONDS)
    async fetchNewPosts() {
        const submissions = await client.getNew('all', {
            limit: 100,
        });

        logger.info('rate-limit', {
            endpoint: 'all/new',
            expiration: client.ratelimitExpiration,
            remaining: client.ratelimitRemaining,
        });

        for (const submission of submissions) {
            logger.info('submission', JSON.parse(JSON.stringify(submission)) as Record<string, unknown>);
        }
    }

    @Cron(Expression.EVERY_30_SECONDS)
    async fetchNewComments() {
        const comments = await client.getNewComments('all', {
            limit: 100,
        });

        logger.info('rate-limit', {
            endpoint: 'all/new',
            expiration: client.ratelimitExpiration,
            remaining: client.ratelimitRemaining,
        });

        for (const comment of comments) {
            logger.info('comment', JSON.parse(JSON.stringify(comment)) as Record<string, unknown>);
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
