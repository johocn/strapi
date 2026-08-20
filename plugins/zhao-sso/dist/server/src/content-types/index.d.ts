declare const _default: {
    "sso-user": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                uuid: {
                    type: string;
                    unique: boolean;
                    required: boolean;
                };
                username: {
                    type: string;
                    unique: boolean;
                };
                mobile: {
                    type: string;
                    unique: boolean;
                };
                email: {
                    type: string;
                    unique: boolean;
                };
                password_hash: {
                    type: string;
                };
                avatar_url: {
                    type: string;
                };
                nickname: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                register_channel: {
                    type: string;
                };
                last_login_channel: {
                    type: string;
                };
                invite_code_used: {
                    type: string;
                };
                invited_by: {
                    type: string;
                };
                utm_source: {
                    type: string;
                };
                utm_medium: {
                    type: string;
                };
                utm_campaign: {
                    type: string;
                };
                last_login_at: {
                    type: string;
                };
                login_count: {
                    type: string;
                    default: number;
                    required: boolean;
                };
                password_changed_at: {
                    type: string;
                };
                third_party_bindings: {
                    type: string;
                    relation: string;
                    target: string;
                    mappedBy: string;
                };
            };
        };
    };
    "sso-third-party-binding": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                user: {
                    type: string;
                    relation: string;
                    target: string;
                    inversedBy: string;
                };
                provider: {
                    type: string;
                    required: boolean;
                };
                provider_user_id: {
                    type: string;
                    required: boolean;
                };
                provider_union_id: {
                    type: string;
                };
                provider_nickname: {
                    type: string;
                };
                provider_avatar: {
                    type: string;
                };
                provider_data: {
                    type: string;
                };
                bound_at: {
                    type: string;
                    required: boolean;
                };
                subscribe: {
                    type: string;
                };
                subscribe_at: {
                    type: string;
                };
                subscribe_check_at: {
                    type: string;
                };
            };
        };
    };
    "sso-app": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                app_code: {
                    type: string;
                    unique: boolean;
                    required: boolean;
                };
                app_name: {
                    type: string;
                    required: boolean;
                };
                app_secret: {
                    type: string;
                    required: boolean;
                };
                redirect_uris: {
                    type: string;
                    required: boolean;
                };
                allowed_grant_types: {
                    type: string;
                    required: boolean;
                };
                is_active: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                description: {
                    type: string;
                };
            };
        };
    };
    "sso-channel": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                channel_code: {
                    type: string;
                    unique: boolean;
                    required: boolean;
                };
                channel_name: {
                    type: string;
                    required: boolean;
                };
                channel_type: {
                    type: string;
                    required: boolean;
                };
                utm_template: {
                    type: string;
                };
                is_active: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                description: {
                    type: string;
                };
            };
        };
    };
    "sso-auth-code": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                code: {
                    type: string;
                    unique: boolean;
                    required: boolean;
                };
                user: {
                    type: string;
                    relation: string;
                    target: string;
                };
                app_code: {
                    type: string;
                    required: boolean;
                };
                redirect_uri: {
                    type: string;
                    required: boolean;
                };
                channel_code: {
                    type: string;
                };
                invite_code: {
                    type: string;
                };
                scopes: {
                    type: string;
                };
                is_new: {
                    type: string;
                    default: boolean;
                };
                expires_at: {
                    type: string;
                    required: boolean;
                };
                used: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
            };
        };
    };
    "sso-token": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                user: {
                    type: string;
                    relation: string;
                    target: string;
                };
                app_code: {
                    type: string;
                    required: boolean;
                };
                access_token_jti: {
                    type: string;
                    unique: boolean;
                    required: boolean;
                };
                refresh_token: {
                    type: string;
                    unique: boolean;
                    required: boolean;
                };
                refresh_expires_at: {
                    type: string;
                    required: boolean;
                };
                revoked: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                revoked_at: {
                    type: string;
                };
                channel_code: {
                    type: string;
                };
            };
        };
    };
    "sso-user-app-role": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                user: {
                    type: string;
                    relation: string;
                    target: string;
                };
                app_code: {
                    type: string;
                    required: boolean;
                };
                role: {
                    type: string;
                    required: boolean;
                };
            };
        };
    };
    "sso-login-log": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                user: {
                    type: string;
                    relation: string;
                    target: string;
                };
                login_type: {
                    type: string;
                    required: boolean;
                };
                provider: {
                    type: string;
                };
                channel_code: {
                    type: string;
                };
                app_code: {
                    type: string;
                };
                ip: {
                    type: string;
                };
                user_agent: {
                    type: string;
                };
                success: {
                    type: string;
                    required: boolean;
                };
                fail_reason: {
                    type: string;
                };
            };
        };
    };
    "sso-invite-code": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                code: {
                    type: string;
                    unique: boolean;
                    required: boolean;
                };
                app_code: {
                    type: string;
                    required: boolean;
                };
                creator: {
                    type: string;
                    relation: string;
                    target: string;
                };
                invite_type: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                max_uses: {
                    type: string;
                };
                use_count: {
                    type: string;
                    default: number;
                    required: boolean;
                };
                per_user_limit: {
                    type: string;
                    default: number;
                    required: boolean;
                };
                valid_from: {
                    type: string;
                };
                valid_until: {
                    type: string;
                };
                bonus_tags: {
                    type: string;
                };
                is_active: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
            };
        };
    };
    "sso-invite-usage": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                invite_code: {
                    type: string;
                    relation: string;
                    target: string;
                };
                user: {
                    type: string;
                    relation: string;
                    target: string;
                };
                channel_code: {
                    type: string;
                };
                app_code: {
                    type: string;
                };
                used_at: {
                    type: string;
                    required: boolean;
                };
            };
        };
    };
    "sso-referral-relation": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                inviter: {
                    type: string;
                    relation: string;
                    target: string;
                };
                invitee: {
                    type: string;
                    relation: string;
                    target: string;
                };
                invite_code: {
                    type: string;
                    relation: string;
                    target: string;
                };
                level: {
                    type: string;
                    required: boolean;
                };
                channel_code: {
                    type: string;
                };
            };
        };
    };
    "sso-invite-stats": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                invite_code: {
                    type: string;
                    relation: string;
                    target: string;
                };
                total_invites: {
                    type: string;
                    required: boolean;
                };
                active_invites: {
                    type: string;
                    required: boolean;
                };
                last_invited_at: {
                    type: string;
                };
            };
        };
    };
    "sso-oauth-config": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                name: {
                    type: string;
                    required: boolean;
                };
                provider: {
                    type: string;
                    required: boolean;
                };
                app_type: {
                    type: string;
                    required: boolean;
                    enum: string[];
                    default: string;
                };
                app_id: {
                    type: string;
                    required: boolean;
                };
                app_secret: {
                    type: string;
                    required: boolean;
                };
                scope: {
                    type: string;
                };
                extra_config: {
                    type: string;
                };
                redirect_uris: {
                    type: string;
                };
                is_enabled: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                description: {
                    type: string;
                };
            };
        };
    };
    "sso-sms-code": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                mobile: {
                    type: string;
                    required: boolean;
                };
                code: {
                    type: string;
                    required: boolean;
                };
                scene: {
                    type: string;
                    default: string;
                    required: boolean;
                };
                expires_at: {
                    type: string;
                    required: boolean;
                };
                used: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                ip: {
                    type: string;
                };
                provider: {
                    type: string;
                    default: string;
                };
            };
        };
    };
    "msg-template": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                code: {
                    type: string;
                    unique: boolean;
                    required: boolean;
                };
                name: {
                    type: string;
                    required: boolean;
                };
                provider: {
                    type: string;
                    default: string;
                    required: boolean;
                };
                wxTemplateId: {
                    type: string;
                };
                wxTemplateFields: {
                    type: string;
                };
                content: {
                    type: string;
                };
                isEnabled: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                description: {
                    type: string;
                };
            };
        };
    };
    "msg-job": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                user: {
                    type: string;
                    relation: string;
                    target: string;
                };
                scene: {
                    type: string;
                    required: boolean;
                };
                template: {
                    type: string;
                    relation: string;
                    target: string;
                };
                provider: {
                    type: string;
                    default: string;
                    required: boolean;
                };
                toTarget: {
                    type: string;
                };
                params: {
                    type: string;
                };
                link: {
                    type: string;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                retryCount: {
                    type: string;
                    default: number;
                };
                nextRetryAt: {
                    type: string;
                };
                wxMsgId: {
                    type: string;
                };
                result: {
                    type: string;
                };
                scheduledAt: {
                    type: string;
                };
                sentAt: {
                    type: string;
                };
                dedupeKey: {
                    type: string;
                    unique: boolean;
                };
            };
        };
    };
    "sop-rule": {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            attributes: {
                code: {
                    type: string;
                    unique: boolean;
                    required: boolean;
                };
                name: {
                    type: string;
                    required: boolean;
                };
                source: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                event: {
                    type: string;
                };
                cronExpression: {
                    type: string;
                };
                templateCode: {
                    type: string;
                };
                scene: {
                    type: string;
                    required: boolean;
                };
                delayMinutes: {
                    type: string;
                    default: number;
                };
                link: {
                    type: string;
                };
                paramsTemplate: {
                    type: string;
                };
                enabled: {
                    type: string;
                    default: boolean;
                    required: boolean;
                };
                description: {
                    type: string;
                };
            };
        };
    };
};
export default _default;
