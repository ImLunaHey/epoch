import 'reflect-metadata';
import { Cron, Expression, initCronJobs } from '@reflet/cron';
import { logger } from '@app/common/logger';
import { getCommitHash } from '@app/common/get-commit-hash';
import Snoowrap, { Comment, Submission } from 'snoowrap';
import { env } from '@app/common/env';
import { excludeKeys } from 'filter-obj';

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
    filter(obj: Record<string, unknown>): Record<string, unknown> {
        return excludeKeys(obj, key => String(key).startsWith('_')) as Record<string, unknown>;
    }

    @Cron(Expression.EVERY_5_SECONDS)
    async fetchNewPosts() {
        const submissions = await client.getNew('all', {
            limit: 100,
        });

        logger.info('rate-limit', {
            endpoint: 'all/new',
            expiration: client.ratelimitExpiration,
            remaining: client.ratelimitRemaining,
        });

        for (const data of submissions) {
            const submission = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
            if (submission.media_metadata) submission.media_metadata = JSON.stringify(submission.media_metadata);
            logger.info('submission', this.filter(submission));
        }
    }

    @Cron(Expression.EVERY_5_SECONDS)
    async fetchNewComments() {
        const comments = await client.getNewComments('all', {
            limit: 100,
        });

        logger.info('rate-limit', {
            endpoint: 'all/new',
            expiration: client.ratelimitExpiration,
            remaining: client.ratelimitRemaining,
        });

        for (const data of comments) {
            const comment = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
            if (comment.media_metadata) comment.media_metadata = JSON.stringify(comment.media_metadata);
            logger.info('comment', this.filter(comment));
        }
    }
}

// eslint-disable-next-line @typescript-eslint/require-await
export const main = async () => {
    logger.info('Application started');

    console.log('process.env', Object.keys(process.env));

    // Start jobs
    const jobs = initCronJobs(Jobs)
    jobs.startAll();
};
