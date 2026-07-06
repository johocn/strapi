import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    signIn: (userId: number) => Promise<{
        signInDate: string;
        streakDays: any;
        pointsEarned: number;
        isStreakReward: boolean;
    }>;
    getSignInStatus: (userId: number) => Promise<{
        isSignedInToday: boolean;
        streakDays: number;
        recentDates: any[];
    }>;
};
export default _default;
