interface PublishParams {
    articleIds: string[];
    platformId: string;
    accountId: string;
}
export declare const usePublishActions: () => {
    publish: ({ articleIds, platformId, accountId }: PublishParams) => Promise<void>;
    publishArticle: (articleId: string, accountIds: string[]) => Promise<void>;
    loading: boolean;
};
export default usePublishActions;
//# sourceMappingURL=usePublishActions.d.ts.map