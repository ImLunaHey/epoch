import fs from 'fs';
import { env } from '@app/common/env';

const getHashFromDisk = () => {
    console.log('getting hash from disk');
    try {
        const fileContents = fs.readFileSync('.git/HEAD').toString();
        const rev = fileContents.trim().split(/.*[: ]/).slice(-1)[0];

        if (rev.indexOf('/') === -1) return rev;
        return fs.readFileSync('.git/' + rev).toString().trim();
    } catch { }

    return null;
};

const getHashFromEnv = () => {
    console.log('getting hash from env');
    return env.GIT_COMMIT_SHA;
};

let commitHash: string;
export const getCommitHash = () => {
    console.log('getting hash');
    if (commitHash) return commitHash;
    commitHash = (getHashFromEnv() ?? getHashFromDisk() ?? 'unknown').substring(0, 12);
    return commitHash;
};
