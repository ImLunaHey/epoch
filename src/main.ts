import 'reflect-metadata';
import { Cron, Expression, initCronJobs } from '@reflet/cron';
import { logger } from '@app/common/logger';
import Snoowrap from 'snoowrap';
import { env } from '@app/common/env';
import { excludeKeys } from 'filter-obj';
import { getCommitHash } from '@app/common/get-commit-hash';

const submissionClient = new Snoowrap({
    userAgent: `epoch:submission-cacher (${getCommitHash()})`,
    clientId: env.SUBMISSION_CLIENT_ID,
    clientSecret: env.SUBMISSION_CLIENT_SECRET,
    refreshToken: env.SUBMISSION_REFRESH_TOKEN,
});

submissionClient.config({
    maxRetryAttempts: 10,
});

const commentClient = new Snoowrap({
    userAgent: `epoch:comment-cacher (${getCommitHash()})`,
    clientId: env.COMMENT_CLIENT_ID,
    clientSecret: env.COMMENT_CLIENT_SECRET,
    refreshToken: env.COMMENT_REFRESH_TOKEN,
});

commentClient.config({
    maxRetryAttempts: 10,
});

@Cron.RunOnInit()
@Cron.UtcOffset(0)
@Cron.Retry({ attempts: 2, delay: 1000 })
class Jobs {
    filter(obj: Record<string, unknown>): Record<string, unknown> {
        return excludeKeys(obj, key => String(key).startsWith('_')) as Record<string, unknown>;
    }

    @Cron(Expression.EVERY_SECOND)
    async fetchNewPosts() {
        try {
            const submissions = await submissionClient.getNew('all', {
                limit: 100,
            });

            logger.info('rate-limit', {
                endpoint: 'all/submissions/new',
                expiration: submissionClient.ratelimitExpiration,
                remaining: submissionClient.ratelimitRemaining,
            });

            for (const data of submissions) {
                const submission = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
                if (submission.media_metadata) submission.media_metadata = JSON.stringify(submission.media_metadata);
                logger.info('submission', this.filter(submission));
            }
        } catch (error: unknown) {
            logger.error('Failed fetching new submissions', {
                error,
            });
        }
    }

    @Cron(Expression.EVERY_SECOND)
    async fetchNewComments() {
        try {
            const comments = await commentClient.getNewComments('all', {
                limit: 100,
            });

            logger.info('rate-limit', {
                endpoint: 'all/comments/new',
                expiration: commentClient.ratelimitExpiration,
                remaining: commentClient.ratelimitRemaining,
            });

            for (const data of comments) {
                const comment = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
                if (comment.media_metadata) comment.media_metadata = JSON.stringify(comment.media_metadata);
                logger.info('comment', this.filter(comment));
            }
        } catch (error: unknown) {
            logger.error('Failed fetching new comments', {
                error,
            });
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
