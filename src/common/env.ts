import 'dotenv/config';
import { z } from 'zod';

/**
 * Specify your environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
const schema = z.object({
    /**
     * The current environment
     */
    NODE_ENV: z.enum(['development', 'test', 'production']),
    /**
     * Which level the logging starts in
     */
    LOG_LEVEL: z.enum(['info', 'timer', 'debug', 'warn', 'error']).optional(),
    /**
     * The current commit hash of this deployment
     */
    GIT_COMMIT_SHA: z.string().optional(),
    CLIENT_ID: z.string(),
    CLIENT_SECRET: z.string(),
    REFRESH_TOKEN: z.string(),
});

const processEnv = {
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
    GIT_COMMIT_SHA: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    REFRESH_TOKEN: process.env.REFRESH_TOKEN,
} satisfies Parameters<typeof schema.safeParse>[0];

// --------------------------
// Don't touch the part below
// --------------------------
if (!!process.env.SKIP_ENV_VALIDATION == false) {
    const parsed = schema.safeParse(processEnv);

    if (parsed.success === false) {
        console.error(
            '❌ Invalid environment variables:',
            parsed.error.flatten().fieldErrors,
        );

        // Only exit if we're not running tests
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
    }
}

export const env = process.env as unknown as z.infer<typeof schema>;
// --------------------------
// Don't touch the part above
// --------------------------
