import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    adminPermissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::permission'
    >;
    adminUserOwner: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    kind: Schema.Attribute.Enumeration<['content-api', 'admin']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'content-api'>;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    apiToken: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
      Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    apiTokens: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 72;
        minLength: 6;
      }>;
    picture: Schema.Attribute.Media;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    zhaoRoles: Schema.Attribute.JSON;
  };
}

export interface PluginZhaoAuthPermission extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_permissions';
  info: {
    displayName: '\u89D2\u8272\u6743\u9650';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    displayName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    isSystem: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    level: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<20>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-auth.permission'
    > &
      Schema.Attribute.Private;
    permissions: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<[]>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoAuthRoleActionLog
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_role_action_logs';
  info: {
    description: '\u89D2\u8272\u64CD\u4F5C\u65E5\u5FD7';
    displayName: 'Role Action Log';
    name: 'role-action-log';
    pluralName: 'role-action-logs';
    singularName: 'role-action-log';
  };
  options: {
    draftAndPublish: false;
    timestamps: false;
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-auth.role-action-log'
    > &
      Schema.Attribute.Private;
    operatorId: Schema.Attribute.Integer & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    reason: Schema.Attribute.Text;
    role: Schema.Attribute.String & Schema.Attribute.Required;
    targetUserId: Schema.Attribute.Integer & Schema.Attribute.Required;
    timestamp: Schema.Attribute.DateTime & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoAuthRoleChannel extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_role_channels';
  info: {
    description: '\u89D2\u8272\u4E0E\u6E20\u9053\u7684\u7ED1\u5B9A\u5173\u7CFB';
    displayName: 'Role Channel';
    pluralName: 'role-channels';
    singularName: 'role-channel';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    assignedBy: Schema.Attribute.Integer;
    channel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-auth.role-channel'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoChannelChannel extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_channels';
  info: {
    description: '\u6E20\u9053';
    displayName: 'Channel';
    pluralName: 'channels';
    singularName: 'channel';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    channelTier: Schema.Attribute.Enumeration<
      [
        'root',
        'core',
        'senior',
        'global',
        'authorized',
        'official',
        'partner',
        'agent',
        'national',
        'regional',
        'city',
        'county',
        'local',
        'store',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'store'>;
    childChannels: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-channel.channel'
    >;
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 32;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    depth: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 7;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    description: Schema.Attribute.Text;
    extraConfig: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<'{}'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-channel.channel'
    > &
      Schema.Attribute.Private;
    members: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-channel.channel-member'
    >;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    parentChannel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    >;
    path: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    sites: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-common.site-config'
    >;
    status: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoChannelChannelMember
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_channel_members';
  info: {
    description: '\u6E20\u9053\u6210\u5458\u5173\u8054';
    displayName: 'Channel Member';
    pluralName: 'channel-members';
    singularName: 'channel-member';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    channel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    invitedBy: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    isCurrent: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-channel.channel-member'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Enumeration<['owner', 'admin', 'member']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'member'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
  };
}

export interface PluginZhaoChannelUserChannel
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_user_channels';
  info: {
    description: '\u7528\u6237-\u6E20\u9053\u5173\u8054';
    displayName: 'User Channel';
    pluralName: 'user-channels';
    singularName: 'user-channel';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    channel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    grantedAt: Schema.Attribute.DateTime;
    grantedBy: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-channel.user-channel'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
  };
}

export interface PluginZhaoChannelUserInvite
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_user_invites';
  info: {
    description: '\u7528\u6237\u9080\u8BF7\u7801\u4E0E\u5206\u9500\u94FE\u4FE1\u606F';
    displayName: 'User Invite';
    pluralName: 'user-invites';
    singularName: 'user-invite';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    distributionDepth: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 2;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    distributionPath: Schema.Attribute.Text;
    expiresAt: Schema.Attribute.DateTime;
    inviteChannel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    >;
    inviteCode: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 16;
      }>;
    invitedBy: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    inviteMethod: Schema.Attribute.Enumeration<['invite_code', 'organic']> &
      Schema.Attribute.DefaultTo<'organic'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-channel.user-invite'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    used: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    user: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
  };
}

export interface PluginZhaoCommonSiteConfig
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_site_configs';
  info: {
    description: '\u7AD9\u70B9\u901A\u7528\u914D\u7F6E\uFF08\u591A\u79DF\u6237\uFF09';
    displayName: '\u7AD9\u70B9\u914D\u7F6E';
    pluralName: 'site-configs';
    singularName: 'site-config';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    channels: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-channel.channel'
    >;
    channelUsage: Schema.Attribute.Enumeration<
      ['site_only', 'site_and_cross', 'site_cross_user']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'site_cross_user'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    customerServiceUrl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    domain: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    extraConfig: Schema.Attribute.JSON;
    favicon: Schema.Attribute.Media<'images'>;
    featureFlags: Schema.Attribute.JSON &
      Schema.Attribute.DefaultTo<{
        channel: true;
        course: true;
        logistics: true;
        oss: false;
        points: true;
        quiz: true;
        sso: false;
        studio: true;
        thirdParty: true;
        website: true;
      }>;
    icpNumber: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Private;
    logistics_contact_matrices: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.contact-matrix'
    >;
    logistics_conversion_events: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.conversion-event'
    >;
    logistics_conversion_funnels: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.conversion-funnel'
    >;
    logistics_customer_profiles: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.customer-profile'
    >;
    logistics_intent_orders: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.intent-order'
    >;
    logistics_landing_pages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.landing-page'
    >;
    logistics_quote_field_rules: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.quote-field-rule'
    >;
    logistics_quote_price_formulas: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.quote-price-formula'
    >;
    logistics_quote_price_rules: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.quote-price-rule'
    >;
    logistics_quote_requests: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.quote-request'
    >;
    logistics_referrals: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.referral'
    >;
    logistics_reviews: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.review'
    >;
    logistics_subscriptions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.subscription'
    >;
    logistics_tracking_nodes: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.tracking-node'
    >;
    logistics_tracking_providers: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.tracking-provider'
    >;
    logistics_tracking_shipments: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.tracking-shipment'
    >;
    logo: Schema.Attribute.Media<'images'>;
    publishedAt: Schema.Attribute.DateTime;
    seoDescription: Schema.Attribute.Text;
    seoKeywords: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    shareDescription: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    shareImage: Schema.Attribute.Media<'images'>;
    shareTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    siteDescription: Schema.Attribute.Text;
    siteName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    studio_sync_events: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.sync-event'
    >;
    tagGroups: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.tag-group'
    >;
    tags: Schema.Attribute.Relation<'oneToMany', 'plugin::zhao-tag.tag'>;
    template: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-template'
    >;
    tencentMapKey: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    themeConfig: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<'{}'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    website_ai_summaries: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.ai-content-summary'
    >;
    website_article_categories: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.article-category'
    >;
    website_articles: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.article'
    >;
    website_brand_info: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::zhao-website.brand-info'
    >;
    website_brand_voices: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.brand-voice'
    >;
    website_cases: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.case'
    >;
    website_compliances: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.compliance'
    >;
    website_downloads: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.download'
    >;
    website_faqs: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.faq'
    >;
    website_first_truths: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.first-truth-policy'
    >;
    website_interactions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.interaction'
    >;
    website_knowledge_entities: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.knowledge-entity'
    >;
    website_knowledge_relations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.knowledge-relation'
    >;
    website_leads: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.lead'
    >;
    website_products: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.product'
    >;
    website_search_logs: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.search-log'
    >;
    website_seo_config: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::zhao-website.seo-config'
    >;
    website_tutorials: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.tutorial'
    >;
    website_visit_logs: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.visit-log'
    >;
  };
}

export interface PluginZhaoCommonSiteTemplate
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_site_templates';
  info: {
    description: '\u79DF\u6237\u914D\u7F6E\u6A21\u677F\uFF0C\u5B9A\u4E49\u9884\u8BBE\u503C\u548C\u5B57\u6BB5\u7EA6\u675F';
    displayName: '\u7AD9\u70B9\u6A21\u677F';
    pluralName: 'site-templates';
    singularName: 'site-template';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    displayName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    fieldConstraints: Schema.Attribute.JSON & Schema.Attribute.Required;
    isDefault: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-common.site-template'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    presetConfig: Schema.Attribute.JSON & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    sites: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-common.site-config'
    >;
    themeConfig: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<'{}'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoCourseCourse extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_courses';
  info: {
    displayName: '\u8BFE\u7A0B';
    pluralName: 'courses';
    singularName: 'course';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    allowCrossChannel: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    auditStatus: Schema.Attribute.Enumeration<
      ['pending', 'approved', 'rejected']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    author: Schema.Attribute.String;
    category: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course-category'
    >;
    channelIds: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<'[]'>;
    channelScope: Schema.Attribute.Enumeration<['all', 'specific']> &
      Schema.Attribute.DefaultTo<'all'>;
    courseEndDate: Schema.Attribute.DateTime;
    courseStartDate: Schema.Attribute.DateTime;
    cover: Schema.Attribute.Media;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    difficulty: Schema.Attribute.Enumeration<
      ['beginner', 'intermediate', 'advanced', 'expert']
    > &
      Schema.Attribute.DefaultTo<'beginner'>;
    discountPrice: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    duration: Schema.Attribute.String;
    enablePoints: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    enrollEndDate: Schema.Attribute.DateTime;
    enrollStartDate: Schema.Attribute.DateTime;
    exams: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-quiz.quiz-exam'
    >;
    isFeatured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isFree: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isPaid: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    keywords: Schema.Attribute.JSON;
    language: Schema.Attribute.Enumeration<
      ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR']
    > &
      Schema.Attribute.DefaultTo<'zh-CN'>;
    lessons: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-course.course-lesson'
    >;
    level: Schema.Attribute.Enumeration<
      ['introductory', 'foundation', 'advanced', 'professional']
    > &
      Schema.Attribute.DefaultTo<'introductory'>;
    likeCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-course.course'
    > &
      Schema.Attribute.Private;
    originalPrice: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    pointChannel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    >;
    points: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    pointsType: Schema.Attribute.Enumeration<
      ['course_points', 'lesson_points']
    > &
      Schema.Attribute.DefaultTo<'course_points'>;
    price: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    publishDate: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    quizzes: Schema.Attribute.Relation<'oneToMany', 'plugin::zhao-quiz.quiz'>;
    rating: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    ratingCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    slug: Schema.Attribute.UID<'title'>;
    sort: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    status: Schema.Attribute.Enumeration<
      ['draft', 'pending', 'published', 'archived']
    > &
      Schema.Attribute.DefaultTo<'draft'>;
    studentCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    tags: Schema.Attribute.Relation<'manyToMany', 'plugin::zhao-tag.tag'>;
    thumbnail: Schema.Attribute.Media;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    viewCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface PluginZhaoCourseCourseCategory
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_course_categories';
  info: {
    displayName: '\u8BFE\u7A0B\u5206\u7C7B';
    pluralName: 'course-categories';
    singularName: 'course-category';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    allowCrossChannel: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    channelIds: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<'[]'>;
    channelScope: Schema.Attribute.Enumeration<['all', 'specific']> &
      Schema.Attribute.DefaultTo<'all'>;
    courses: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-course.course'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-course.course-category'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    sort: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoCourseCourseLesson
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_course_lessons';
  info: {
    displayName: '\u8BFE\u65F6';
    pluralName: 'course-lessons';
    singularName: 'course-lesson';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    attachments: Schema.Attribute.Media<undefined, true>;
    audio_url: Schema.Attribute.String;
    completionThreshold: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<100>;
    content: Schema.Attribute.RichText;
    course: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    duration: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    enablePoints: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    exams: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-quiz.quiz-exam'
    >;
    images: Schema.Attribute.Media<undefined, true>;
    isFreePreview: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isRequired: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    learningObjectives: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-course.course-lesson'
    > &
      Schema.Attribute.Private;
    points: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    pointsType: Schema.Attribute.Enumeration<['lesson_points', 'quiz_points']> &
      Schema.Attribute.DefaultTo<'lesson_points'>;
    prerequisites: Schema.Attribute.Text;
    previewDuration: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    quizzes: Schema.Attribute.Relation<'oneToMany', 'plugin::zhao-quiz.quiz'>;
    sequenceNumber: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    slug: Schema.Attribute.UID<'title'>;
    sort: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    summary: Schema.Attribute.Text;
    tags: Schema.Attribute.Relation<'manyToMany', 'plugin::zhao-tag.tag'>;
    thumbnail: Schema.Attribute.Media;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    type: Schema.Attribute.Enumeration<['video', 'audio', 'article', 'quiz']> &
      Schema.Attribute.DefaultTo<'video'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    video_url: Schema.Attribute.String;
  };
}

export interface PluginZhaoCourseCourseProgress
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_course_progresses';
  info: {
    displayName: '\u8BFE\u7A0B\u5B66\u4E60\u8BB0\u5F55';
    pluralName: 'course-progresses';
    singularName: 'course-progress';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    completedLessons: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    course: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    isCompleted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isPointsClaimed: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    lastStudyAt: Schema.Attribute.DateTime;
    lessonPointsSummary: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-course.course-progress'
    > &
      Schema.Attribute.Private;
    pointsEarned: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    progress: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    totalLessons: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginZhaoCourseLessonProgress
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_lesson_progresses';
  info: {
    displayName: '\u8BFE\u65F6\u5B66\u4E60\u8BB0\u5F55';
    pluralName: 'lesson-progresses';
    singularName: 'lesson-progress';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    calculatedPoints: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    course: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    duration: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    isAnswered: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isCompleted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isCorrect: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isPointsClaimed: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    lastStudyAt: Schema.Attribute.DateTime;
    lesson: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course-lesson'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-course.lesson-progress'
    > &
      Schema.Attribute.Private;
    playPosition: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    pointsEarned: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    progress: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    quizPointsDetail: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginZhaoCourseUserCourseAuth
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_user_course_auths';
  info: {
    displayName: '\u7528\u6237\u8BFE\u7A0B\u6388\u6743';
    pluralName: 'user-course-auths';
    singularName: 'user-course-auth';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    authType: Schema.Attribute.Enumeration<['free', 'paid', 'admin_grant']> &
      Schema.Attribute.DefaultTo<'free'>;
    channel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    >;
    course: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    expiresAt: Schema.Attribute.DateTime;
    isExpired: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-course.user-course-auth'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginZhaoLogisticsContactMatrix
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_contact_matrices';
  info: {
    displayName: '\u8054\u7CFB\u6E20\u9053\u77E9\u9635';
    pluralName: 'contact-matrices';
    singularName: 'contact-matrix';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    callbackNote: Schema.Attribute.Text;
    channels: Schema.Attribute.JSON & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    flag: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }>;
    hotline: Schema.Attribute.JSON & Schema.Attribute.Required;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    lang: Schema.Attribute.Enumeration<['cn', 'jp', 'kr', 'vn']> &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.contact-matrix'
    >;
    primary: Schema.Attribute.JSON & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    short: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoLogisticsConversionEvent
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_conversion_events';
  info: {
    displayName: '\u8F6C\u5316\u4E8B\u4EF6';
    pluralName: 'conversion-events';
    singularName: 'conversion-event';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    eventName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    funnel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-logistics.conversion-funnel'
    > &
      Schema.Attribute.Required;
    ipAddress: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 45;
      }>;
    landingPageId: Schema.Attribute.String;
    lang: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.conversion-event'
    > &
      Schema.Attribute.Private;
    occurredAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    quoteRequestId: Schema.Attribute.String;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    step: Schema.Attribute.Integer & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    userAgent: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    utmCampaign: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmMedium: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmSource: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    visitorId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
  };
}

export interface PluginZhaoLogisticsConversionFunnel
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_conversion_funnels';
  info: {
    displayName: '\u8F6C\u5316\u6F0F\u6597';
    pluralName: 'conversion-funnels';
    singularName: 'conversion-funnel';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    events: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.conversion-event'
    >;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    lang: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.conversion-funnel'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    steps: Schema.Attribute.JSON & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoLogisticsCustomerProfile
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_customer_profiles';
  info: {
    displayName: '\u5BA2\u6237\u6863\u6848';
    pluralName: 'customer-profiles';
    singularName: 'customer-profile';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    assignedTo: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    company: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    contactEmail: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    contactKakao: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    contactLine: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    contactPhone: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    contactWechat: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    contactZalo: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    country: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    customerType: Schema.Attribute.Enumeration<
      ['individual', 'business', 'fba_seller']
    > &
      Schema.Attribute.Required;
    deletedAt: Schema.Attribute.DateTime;
    lastOrderAt: Schema.Attribute.DateTime;
    lastQuoteAt: Schema.Attribute.DateTime;
    lifecycleStage: Schema.Attribute.Enumeration<
      ['lead', 'active', 'repeat', 'vip', 'churned']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'lead'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.customer-profile'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    preferredLang: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }>;
    preferredRoute: Schema.Attribute.JSON;
    preferredService: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    relatedLeadIds: Schema.Attribute.JSON;
    relatedOrderIds: Schema.Attribute.JSON;
    relatedQuoteIds: Schema.Attribute.JSON;
    remark: Schema.Attribute.Text;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    sourceChannel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    tags: Schema.Attribute.JSON;
    title: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    totalOrderCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    totalOrderValue: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    totalQuoteCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    utmSource: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
  };
}

export interface PluginZhaoLogisticsIntentOrder
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_intent_orders';
  info: {
    displayName: '\u610F\u5411\u8BA2\u5355';
    pluralName: 'intent-orders';
    singularName: 'intent-order';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actualShipDate: Schema.Attribute.Date;
    assignedTo: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    cargoSummary: Schema.Attribute.JSON & Schema.Attribute.Required;
    confirmedPrice: Schema.Attribute.JSON & Schema.Attribute.Required;
    contractSigned: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    convertedToOrderId: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    customerContact: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    customerName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    customerType: Schema.Attribute.Enumeration<
      ['individual', 'business', 'fba_seller']
    >;
    deletedAt: Schema.Attribute.DateTime;
    depositAmount: Schema.Attribute.Decimal;
    depositPaid: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    followUpRecords: Schema.Attribute.JSON;
    leadId: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.intent-order'
    > &
      Schema.Attribute.Private;
    orderNo: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    plannedShipDate: Schema.Attribute.Date;
    publishedAt: Schema.Attribute.DateTime;
    quoteRequestId: Schema.Attribute.String & Schema.Attribute.Required;
    remark: Schema.Attribute.Text;
    routeSummary: Schema.Attribute.JSON & Schema.Attribute.Required;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<
      ['intent', 'confirmed', 'shipping', 'delivered', 'cancelled']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'intent'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoLogisticsLandingPage
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_landing_pages';
  info: {
    displayName: '\u8425\u9500\u843D\u5730\u9875';
    pluralName: 'landing-pages';
    singularName: 'landing-page';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    campaignName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    conversionGoal: Schema.Attribute.Enumeration<
      ['quote_submit', 'contact_click', 'phone_call', 'download']
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    endAt: Schema.Attribute.DateTime;
    formConfig: Schema.Attribute.JSON;
    heroContent: Schema.Attribute.JSON & Schema.Attribute.Required;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.landing-page'
    >;
    ogImage: Schema.Attribute.Media;
    parentPageId: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    sections: Schema.Attribute.JSON & Schema.Attribute.Required;
    seoDescription: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    seoTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    slug: Schema.Attribute.UID & Schema.Attribute.Required;
    startAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<['draft', 'published', 'archived']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    utmCampaign: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmContent: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmMedium: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmSource: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmTerm: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    variant: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
  };
}

export interface PluginZhaoLogisticsQuoteFieldRule
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_quote_field_rules';
  info: {
    displayName: '\u8BE2\u4EF7\u52A8\u6001\u5B57\u6BB5\u89C4\u5219';
    pluralName: 'quote-field-rules';
    singularName: 'quote-field-rule';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    customerType: Schema.Attribute.Enumeration<
      ['individual', 'business', 'fba_seller']
    >;
    deletedAt: Schema.Attribute.DateTime;
    fields: Schema.Attribute.JSON & Schema.Attribute.Required;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.quote-field-rule'
    >;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    priority: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    routeId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    serviceProvider: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoLogisticsQuotePriceFormula
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_quote_price_formulas';
  info: {
    displayName: '\u62A5\u4EF7\u516C\u5F0F\u6A21\u677F';
    pluralName: 'quote-price-formulas';
    singularName: 'quote-price-formula';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    expression: Schema.Attribute.Text & Schema.Attribute.Required;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.quote-price-formula'
    >;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    price_rules: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.quote-price-rule'
    >;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    variables: Schema.Attribute.JSON & Schema.Attribute.Required;
  };
}

export interface PluginZhaoLogisticsQuotePriceRule
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_quote_price_rules';
  info: {
    displayName: '\u62A5\u4EF7\u89C4\u5219\u8868';
    pluralName: 'quote-price-rules';
    singularName: 'quote-price-rule';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }> &
      Schema.Attribute.DefaultTo<'CNY'>;
    deletedAt: Schema.Attribute.DateTime;
    effectiveFrom: Schema.Attribute.Date & Schema.Attribute.Required;
    effectiveTo: Schema.Attribute.Date;
    formula: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-logistics.quote-price-formula'
    >;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.quote-price-rule'
    > &
      Schema.Attribute.Private;
    maxWeight: Schema.Attribute.Decimal & Schema.Attribute.Required;
    minCharge: Schema.Attribute.Decimal;
    minWeight: Schema.Attribute.Decimal & Schema.Attribute.Required;
    pricePerKg: Schema.Attribute.Decimal & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    routeId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    serviceProvider: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    surcharges: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    volumetricFactor: Schema.Attribute.Integer;
  };
}

export interface PluginZhaoLogisticsQuoteRequest
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_quote_requests';
  info: {
    displayName: '\u7269\u6D41\u8BE2\u4EF7\u5355';
    pluralName: 'quote-requests';
    singularName: 'quote-request';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    cargoType: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    customerContact: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    customerName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    customerType: Schema.Attribute.Enumeration<
      ['individual', 'business', 'fba_seller']
    >;
    deletedAt: Schema.Attribute.DateTime;
    destination: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    formData: Schema.Attribute.JSON & Schema.Attribute.Required;
    lang: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }>;
    leadId: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.quote-request'
    > &
      Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    quotedPrice: Schema.Attribute.JSON;
    remark: Schema.Attribute.Text;
    routeId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    serviceProvider: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<
      ['draft', 'submitted', 'quoted', 'accepted', 'rejected', 'expired']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'submitted'>;
    trackingNo: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    utmCampaign: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmMedium: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmSource: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    volume: Schema.Attribute.Decimal;
    weight: Schema.Attribute.Decimal & Schema.Attribute.Required;
  };
}

export interface PluginZhaoLogisticsReferral
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_referrals';
  info: {
    displayName: '\u63A8\u8350\u5956\u52B1';
    pluralName: 'referrals';
    singularName: 'referral';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    conversionValue: Schema.Attribute.Decimal;
    convertedAt: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    intentOrderId: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.referral'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    quoteRequestId: Schema.Attribute.String;
    refereeContact: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    refereeCustomerId: Schema.Attribute.String;
    refereeName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    referralChannel: Schema.Attribute.Enumeration<
      ['friend', 'community', 'exhibition', 'partner', 'other']
    > &
      Schema.Attribute.Required;
    referralCode: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    referralSource: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    referrerContact: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    referrerCustomerId: Schema.Attribute.String;
    referrerName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    remark: Schema.Attribute.Text;
    rewardAmount: Schema.Attribute.Decimal;
    rewardIssuedAt: Schema.Attribute.DateTime;
    rewardStatus: Schema.Attribute.Enumeration<
      ['pending', 'issued', 'claimed']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    rewardType: Schema.Attribute.Enumeration<
      ['points', 'cash', 'discount', 'gift']
    > &
      Schema.Attribute.Required;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<
      ['pending', 'contacted', 'qualified', 'converted', 'rewarded', 'invalid']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoLogisticsReview extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_reviews';
  info: {
    displayName: '\u5BA2\u6237\u8BC4\u4EF7';
    pluralName: 'reviews';
    singularName: 'review';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    authorCompany: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    authorCountry: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }>;
    authorName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    authorTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    content: Schema.Attribute.Text & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    images: Schema.Attribute.Media<undefined, true>;
    isFeatured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isVerified: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.review'
    >;
    orderRef: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    rating: Schema.Attribute.Integer & Schema.Attribute.Required;
    replyAt: Schema.Attribute.DateTime;
    replyContent: Schema.Attribute.Text;
    routeId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    serviceProvider: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<['pending', 'approved', 'rejected']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    testimonialType: Schema.Attribute.Enumeration<
      ['text', 'video', 'case_study']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'text'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    videoPoster: Schema.Attribute.Media;
    videoUrl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
  };
}

export interface PluginZhaoLogisticsSubscription
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_subscriptions';
  info: {
    displayName: '\u901A\u77E5\u8BA2\u9605';
    pluralName: 'subscriptions';
    singularName: 'subscription';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    channel: Schema.Attribute.Enumeration<
      ['email', 'line', 'kakao', 'zalo', 'wechat', 'sms']
    > &
      Schema.Attribute.Required;
    channelTarget: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    eventFilter: Schema.Attribute.JSON;
    frequency: Schema.Attribute.Enumeration<['realtime', 'daily', 'weekly']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'realtime'>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    language: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }>;
    lastNotifiedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.subscription'
    > &
      Schema.Attribute.Private;
    notifyCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    quoteRequestId: Schema.Attribute.String;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    subscribedAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    subscriberType: Schema.Attribute.Enumeration<
      ['tracking_update', 'quote_reply', 'promotion', 'newsletter']
    > &
      Schema.Attribute.Required;
    trackingNo: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    unsubscribedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoLogisticsTrackingNode
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_tracking_nodes';
  info: {
    displayName: '\u8FFD\u8E2A\u8282\u70B9';
    pluralName: 'tracking-nodes';
    singularName: 'tracking-node';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dataSource: Schema.Attribute.Enumeration<['internal', 'external']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'internal'>;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    eventTime: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.tracking-node'
    >;
    location: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    nodeStatus: Schema.Attribute.Enumeration<
      ['done', 'active', 'pending', 'alert']
    > &
      Schema.Attribute.Required;
    nodeType: Schema.Attribute.Enumeration<
      [
        'picked_up',
        'export',
        'import',
        'customs',
        'hold',
        'delivery',
        'delivered',
        'exception',
      ]
    > &
      Schema.Attribute.Required;
    providerRef: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    shipment: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-logistics.tracking-shipment'
    > &
      Schema.Attribute.Required;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoLogisticsTrackingProvider
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_tracking_providers';
  info: {
    displayName: '\u8FFD\u8E2A API \u914D\u7F6E';
    pluralName: 'tracking-providers';
    singularName: 'tracking-provider';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    apiKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    apiSecret: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    endpoint: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    extraConfig: Schema.Attribute.JSON;
    isEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.tracking-provider'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    providerType: Schema.Attribute.Enumeration<
      ['track17', 'afterShip', 'kuaidi100', 'customApi']
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    rateLimit: Schema.Attribute.Integer;
    shipments: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.tracking-shipment'
    >;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    supportedCarriers: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoLogisticsTrackingShipment
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_logistics_tracking_shipments';
  info: {
    displayName: '\u8D27\u7269\u8FFD\u8E2A\u4E3B\u8868';
    pluralName: 'tracking-shipments';
    singularName: 'tracking-shipment';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actualDelivery: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    customerContact: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    customerName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    deletedAt: Schema.Attribute.DateTime;
    destination: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    eta: Schema.Attribute.DateTime;
    lastSyncAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.tracking-shipment'
    > &
      Schema.Attribute.Private;
    nodes: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-logistics.tracking-node'
    >;
    orderId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    serviceProvider: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<
      [
        'pending',
        'in_transit',
        'customs',
        'hold',
        'delivered',
        'exception',
        'returned',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    syncProvider: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-logistics.tracking-provider'
    >;
    trackingNo: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoOssMediaMeta extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_oss_media_metas';
  info: {
    description: '\u5A92\u4F53\u4E1A\u52A1\u5143\u4FE1\u606F\uFF08\u79DF\u6237/\u4E0A\u4F20\u8005/\u5206\u7C7B\uFF09';
    displayName: 'Media Meta';
    pluralName: 'media-metas';
    singularName: 'media-meta';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    category: Schema.Attribute.Enumeration<
      [
        'brand',
        'article',
        'product',
        'case',
        'compliance',
        'faq',
        'tutorial',
        'download',
        'avatar',
        'general',
        'other',
      ]
    > &
      Schema.Attribute.DefaultTo<'general'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    file: Schema.Attribute.Relation<'oneToOne', 'plugin::upload.file'> &
      Schema.Attribute.Required;
    fileExt: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    fileId: Schema.Attribute.Integer & Schema.Attribute.Required;
    fileSize: Schema.Attribute.BigInteger;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    isPublic: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    lastUsedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-oss.media-meta'
    > &
      Schema.Attribute.Private;
    mimeType: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    modifier: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    originalFilename: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    tags: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    uploader: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    uploaderRole: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    usageCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface PluginZhaoOssSyncRecord extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_oss_sync_records';
  info: {
    description: 'OSS \u540C\u6B65\u8BB0\u5F55\uFF0C\u8FFD\u8E2A\u6587\u4EF6\u5907\u4EFD\u72B6\u6001';
    displayName: 'Sync Record';
    pluralName: 'sync-records';
    singularName: 'sync-record';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    errorMessage: Schema.Attribute.Text;
    fileHash: Schema.Attribute.String & Schema.Attribute.Required;
    fileId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    lastSyncedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-oss.sync-record'
    > &
      Schema.Attribute.Private;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    remoteEtag: Schema.Attribute.String;
    remoteUrl: Schema.Attribute.String;
    retryCount: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    status: Schema.Attribute.Enumeration<
      ['pending', 'syncing', 'success', 'failed', 'skipped', 'deleted']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoPointChannelVerification
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_channel_verifications';
  info: {
    description: '\u6E20\u9053\u6838\u9500\u5BA1\u8BA1\u65E5\u5FD7';
    displayName: '\u6E20\u9053\u6838\u9500';
    pluralName: 'channel-verifications';
    singularName: 'channel-verification';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    channel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    direction: Schema.Attribute.Enumeration<
      ['superior_to_subordinate', 'subordinate_to_superior']
    > &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-point.channel-verification'
    > &
      Schema.Attribute.Private;
    location: Schema.Attribute.JSON;
    method: Schema.Attribute.Enumeration<['qr_scan', 'manual']> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    qrCodeExpiresAt: Schema.Attribute.DateTime;
    qrCodeToken: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    remark: Schema.Attribute.Text;
    status: Schema.Attribute.Enumeration<['pending', 'approved', 'rejected']> &
      Schema.Attribute.DefaultTo<'pending'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    verifiedAt: Schema.Attribute.DateTime;
    verifiedUser: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
    verifier: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
  };
}

export interface PluginZhaoPointPickupLocation
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_pickup_locations';
  info: {
    description: '\u5546\u54C1\u81EA\u63D0\u70B9\u4FE1\u606F';
    displayName: '\u81EA\u63D0\u70B9';
    pluralName: 'pickup-locations';
    singularName: 'pickup-location';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    address: Schema.Attribute.Text;
    businessHours: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    businessLicense: Schema.Attribute.Media<'images'>;
    channels: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-channel.channel'
    >;
    coverImage: Schema.Attribute.Media<'images'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    latitude: Schema.Attribute.Decimal;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-point.pickup-location'
    > &
      Schema.Attribute.Private;
    longitude: Schema.Attribute.Decimal;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    phone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    status: Schema.Attribute.Enumeration<['active', 'inactive']> &
      Schema.Attribute.DefaultTo<'active'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoPointPointConfig
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_point_configs';
  info: {
    description: '\u79EF\u5206\u6A21\u5757\u5168\u5C40\u914D\u7F6E';
    displayName: '\u79EF\u5206\u914D\u7F6E';
    pluralName: 'point-configs';
    singularName: 'point-config';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    defaultExchangeRate: Schema.Attribute.Decimal &
      Schema.Attribute.DefaultTo<1>;
    earnEnabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    expiryDays: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<365>;
    expiryEnabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    expiryReminderDays: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<7>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-point.point-config'
    > &
      Schema.Attribute.Private;
    maxDailyEarn: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    maxDailyQuiz: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<3>;
    minRedeemPoints: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    moduleEnabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    publishedAt: Schema.Attribute.DateTime;
    quizMaxRetryCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    quizRetryEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    redeemEnabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    remark: Schema.Attribute.Text;
    signInEnabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    tasksEnabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    tencentMapKey: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoPointPointProduct
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_point_products';
  info: {
    description: '\u79EF\u5206\u5546\u57CE\u5546\u54C1';
    displayName: '\u79EF\u5206\u5546\u54C1';
    pluralName: 'point-products';
    singularName: 'point-product';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    allowCrossChannel: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    allowGlobalPoints: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    category: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    channel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    >;
    coverImage: Schema.Attribute.Media<'images'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    deliveryType: Schema.Attribute.Enumeration<
      ['self_pickup', 'express', 'both']
    > &
      Schema.Attribute.Required;
    description: Schema.Attribute.Text;
    detail: Schema.Attribute.RichText;
    images: Schema.Attribute.Media<'images', true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-point.point-product'
    > &
      Schema.Attribute.Private;
    maxPerUser: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    originalPrice: Schema.Attribute.Decimal;
    pointsCost: Schema.Attribute.Integer & Schema.Attribute.Required;
    price: Schema.Attribute.Decimal;
    publishedAt: Schema.Attribute.DateTime;
    salesMode: Schema.Attribute.Enumeration<
      ['points_only', 'purchase_only', 'hybrid']
    > &
      Schema.Attribute.DefaultTo<'points_only'>;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    status: Schema.Attribute.Enumeration<['on_shelf', 'off_shelf']> &
      Schema.Attribute.DefaultTo<'on_shelf'>;
    stock: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    subtitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    totalStock: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    video: Schema.Attribute.Media<'videos'>;
  };
}

export interface PluginZhaoPointPointRecord
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_point_records';
  info: {
    description: '\u7528\u6237\u79EF\u5206\u53D8\u52A8\u8BB0\u5F55';
    displayName: '\u79EF\u5206\u8BB0\u5F55';
    pluralName: 'point-records';
    singularName: 'point-record';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    balance: Schema.Attribute.Integer & Schema.Attribute.Required;
    channel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    expiredAt: Schema.Attribute.DateTime;
    expiresAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-point.point-record'
    > &
      Schema.Attribute.Private;
    method: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    operator: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    orderId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    points: Schema.Attribute.Integer & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    remark: Schema.Attribute.Text;
    source: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    type: Schema.Attribute.Enumeration<['increase', 'decrease']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
    userChannel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    >;
  };
}

export interface PluginZhaoPointPointRedemption
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_point_redemptions';
  info: {
    description: '\u7528\u6237\u79EF\u5206\u5151\u6362\u793C\u54C1\u8BB0\u5F55';
    displayName: '\u79EF\u5206\u5151\u6362';
    pluralName: 'point-redemptions';
    singularName: 'point-redemption';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    channel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    >;
    completedAt: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deductionDetail: Schema.Attribute.JSON;
    deletedAt: Schema.Attribute.DateTime;
    deliveryType: Schema.Attribute.Enumeration<['self_pickup', 'express']>;
    expressCompany: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    itemName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-point.point-redemption'
    > &
      Schema.Attribute.Private;
    operator: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    pickupCode: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    pickupLocation: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-point.pickup-location'
    >;
    pointsAmount: Schema.Attribute.Integer;
    pointsCost: Schema.Attribute.Integer & Schema.Attribute.Required;
    priceAmount: Schema.Attribute.Decimal;
    product: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-point.point-product'
    >;
    publishedAt: Schema.Attribute.DateTime;
    quantity: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    receiverAddress: Schema.Attribute.Text;
    receiverName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    receiverPhone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    remark: Schema.Attribute.Text;
    salesMode: Schema.Attribute.Enumeration<
      ['points_only', 'purchase_only', 'hybrid']
    >;
    status: Schema.Attribute.Enumeration<
      ['pending', 'approved', 'rejected', 'shipped', 'completed', 'cancelled']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    totalCost: Schema.Attribute.Integer & Schema.Attribute.Required;
    trackingNumber: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
  };
}

export interface PluginZhaoPointPointRule extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_point_rules';
  info: {
    description: '\u79EF\u5206\u83B7\u53D6/\u6263\u9664\u89C4\u5219\u914D\u7F6E';
    displayName: '\u79EF\u5206\u89C4\u5219';
    pluralName: 'point-rules';
    singularName: 'point-rule';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    applicableChannels: Schema.Attribute.JSON;
    category: Schema.Attribute.Enumeration<['increase', 'decrease']> &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    endTime: Schema.Attribute.Time;
    extraConfig: Schema.Attribute.JSON;
    isOneTime: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    limitPerDay: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    limitPerDayPerUser: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<0>;
    limitPerUser: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-point.point-rule'
    > &
      Schema.Attribute.Private;
    points: Schema.Attribute.Integer & Schema.Attribute.Required;
    priority: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    startTime: Schema.Attribute.Time;
    taskGroup: Schema.Attribute.Enumeration<
      [
        'daily',
        'interact',
        'learn',
        'social',
        'onetime',
        'other',
        'redeem',
        'penalty',
      ]
    > &
      Schema.Attribute.DefaultTo<'other'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoPointPointType extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_point_types';
  info: {
    description: '\u79EF\u5206\u5206\u7C7B\u7BA1\u7406';
    displayName: '\u79EF\u5206\u7C7B\u578B';
    pluralName: 'point-types';
    singularName: 'point-type';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    canExpire: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    expireDays: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<365>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-point.point-type'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoPointRuleTemplate
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_rule_templates';
  info: {
    description: '\u79EF\u5206\u89C4\u5219\u6A21\u677F';
    displayName: '\u89C4\u5219\u6A21\u677F';
    pluralName: 'rule-templates';
    singularName: 'rule-template';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    builtIn: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    category: Schema.Attribute.Enumeration<['increase', 'decrease']> &
      Schema.Attribute.Required;
    configSchema: Schema.Attribute.JSON & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    defaultIsOneTime: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    defaultLimitPerDay: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<0>;
    defaultPoints: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    description: Schema.Attribute.Text;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-point.rule-template'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoPointSignInRecord
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_point_sign_in_records';
  info: {
    description: '\u7528\u6237\u7B7E\u5230\u8BB0\u5F55';
    displayName: '\u7B7E\u5230\u8BB0\u5F55';
    pluralName: 'sign-in-records';
    singularName: 'sign-in-record';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    isStreakReward: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-point.sign-in-record'
    > &
      Schema.Attribute.Private;
    pointsEarned: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    signInDate: Schema.Attribute.Date & Schema.Attribute.Required;
    streakDays: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
  };
}

export interface PluginZhaoQuizQuiz extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_quizzes';
  info: {
    displayName: '\u9898\u76EE';
    pluralName: 'quizzes';
    singularName: 'quiz';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    answer: Schema.Attribute.Text;
    channelIds: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<'[]'>;
    channelScope: Schema.Attribute.Enumeration<['all', 'specific']> &
      Schema.Attribute.DefaultTo<'all'>;
    course: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    difficulty: Schema.Attribute.Enumeration<['easy', 'medium', 'hard']> &
      Schema.Attribute.DefaultTo<'medium'>;
    exams: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-quiz.quiz-exam'
    >;
    explanation: Schema.Attribute.RichText;
    isPublished: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    lesson: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course-lesson'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-quiz.quiz'
    > &
      Schema.Attribute.Private;
    options: Schema.Attribute.JSON;
    points: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    sort: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    tags: Schema.Attribute.Relation<'manyToMany', 'plugin::zhao-tag.tag'>;
    title: Schema.Attribute.RichText & Schema.Attribute.Required;
    type: Schema.Attribute.Enumeration<
      [
        'single_choice',
        'multiple_choice',
        'true_false',
        'fill_blank',
        'short_answer',
        'essay',
        'matching',
        'ordering',
      ]
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoQuizQuizBatch extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_quiz_batches';
  info: {
    displayName: '\u6279\u91CF\u5BFC\u5165';
    pluralName: 'quiz-batches';
    singularName: 'quiz-batch';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    course: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    errorCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    errors: Schema.Attribute.JSON;
    file: Schema.Attribute.Media;
    lesson: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course-lesson'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-quiz.quiz-batch'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['pending', 'processing', 'completed', 'failed']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    successCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    templateFile: Schema.Attribute.Media;
    totalCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoQuizQuizExam extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_quiz_exams';
  info: {
    displayName: '\u8003\u8BD5\u914D\u7F6E';
    pluralName: 'quiz-exams';
    singularName: 'quiz-exam';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    allowRetry: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    channelIds: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<'[]'>;
    channelScope: Schema.Attribute.Enumeration<['all', 'specific']> &
      Schema.Attribute.DefaultTo<'all'>;
    course: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    lesson: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course-lesson'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-quiz.quiz-exam'
    > &
      Schema.Attribute.Private;
    maxAttempts: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    passScore: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<60>;
    publishedAt: Schema.Attribute.DateTime;
    questionCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    questionPoints: Schema.Attribute.JSON;
    questions: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-quiz.quiz'
    >;
    randomOrder: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    showResult: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    timeLimit: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    totalPoints: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoQuizQuizExamAttempt
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_quiz_exam_attempts';
  info: {
    displayName: '\u8003\u8BD5\u8BB0\u5F55';
    pluralName: 'quiz-exam-attempts';
    singularName: 'quiz-exam-attempt';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    answers: Schema.Attribute.JSON;
    attemptNumber: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    duration: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    exam: Schema.Attribute.Relation<'manyToOne', 'plugin::zhao-quiz.quiz-exam'>;
    isPassed: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-quiz.quiz-exam-attempt'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    startedAt: Schema.Attribute.DateTime;
    submittedAt: Schema.Attribute.DateTime;
    totalScore: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginZhaoQuizQuizRecord extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_quiz_records';
  info: {
    displayName: '\u7B54\u9898\u8BB0\u5F55';
    pluralName: 'quiz-records';
    singularName: 'quiz-record';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    answer: Schema.Attribute.JSON;
    course: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    duration: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    gradedAt: Schema.Attribute.DateTime;
    grader: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    isCorrect: Schema.Attribute.Boolean;
    lesson: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-course.course-lesson'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-quiz.quiz-record'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    quiz: Schema.Attribute.Relation<'manyToOne', 'plugin::zhao-quiz.quiz'>;
    score: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    scoringStatus: Schema.Attribute.Enumeration<
      ['pending', 'auto_graded', 'manual_graded']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    submittedAt: Schema.Attribute.DateTime;
    teacherScore: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    totalPoints: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginZhaoSsoSsoApp extends Struct.CollectionTypeSchema {
  collectionName: 'sso_apps';
  info: {
    displayName: 'SSO App';
    pluralName: 'sso-apps';
    singularName: 'sso-app';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    allowed_grant_types: Schema.Attribute.JSON & Schema.Attribute.Required;
    app_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    app_name: Schema.Attribute.String & Schema.Attribute.Required;
    app_secret: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    is_active: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-app'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    redirect_uris: Schema.Attribute.JSON & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoSsoSsoAuthCode extends Struct.CollectionTypeSchema {
  collectionName: 'sso_auth_codes';
  info: {
    displayName: 'SSO Auth Code';
    pluralName: 'sso-auth-codes';
    singularName: 'sso-auth-code';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    app_code: Schema.Attribute.String & Schema.Attribute.Required;
    channel_code: Schema.Attribute.String;
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    expires_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-auth-code'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    redirect_uri: Schema.Attribute.Text & Schema.Attribute.Required;
    scopes: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    used: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    user: Schema.Attribute.Relation<'manyToOne', 'plugin::zhao-sso.sso-user'>;
  };
}

export interface PluginZhaoSsoSsoChannel extends Struct.CollectionTypeSchema {
  collectionName: 'sso_channels';
  info: {
    displayName: 'SSO Channel';
    pluralName: 'sso-channels';
    singularName: 'sso-channel';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    channel_code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    channel_name: Schema.Attribute.String & Schema.Attribute.Required;
    channel_type: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    is_active: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-channel'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    utm_template: Schema.Attribute.JSON;
  };
}

export interface PluginZhaoSsoSsoInviteCode
  extends Struct.CollectionTypeSchema {
  collectionName: 'sso_invite_codes';
  info: {
    displayName: 'SSO Invite Code';
    pluralName: 'sso-invite-codes';
    singularName: 'sso-invite-code';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bonus_tags: Schema.Attribute.JSON;
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    creator: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-sso.sso-user'
    >;
    invite_type: Schema.Attribute.Enumeration<['system', 'user_campaign']> &
      Schema.Attribute.Required;
    is_active: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-invite-code'
    > &
      Schema.Attribute.Private;
    max_uses: Schema.Attribute.Integer;
    per_user_limit: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<1>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    use_count: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<0>;
    valid_from: Schema.Attribute.DateTime;
    valid_until: Schema.Attribute.DateTime;
  };
}

export interface PluginZhaoSsoSsoInviteStats
  extends Struct.CollectionTypeSchema {
  collectionName: 'sso_invite_stats';
  info: {
    displayName: 'SSO Invite Stats';
    pluralName: 'sso-invite-stats';
    singularName: 'sso-invite-stats';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    active_invites: Schema.Attribute.Integer & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    invite_code: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::zhao-sso.sso-invite-code'
    >;
    last_invited_at: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-invite-stats'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    total_invites: Schema.Attribute.Integer & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoSsoSsoInviteUsage
  extends Struct.CollectionTypeSchema {
  collectionName: 'sso_invite_usages';
  info: {
    displayName: 'SSO Invite Usage';
    pluralName: 'sso-invite-usages';
    singularName: 'sso-invite-usage';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    app_code: Schema.Attribute.String;
    channel_code: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    invite_code: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-sso.sso-invite-code'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-invite-usage'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    used_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    user: Schema.Attribute.Relation<'manyToOne', 'plugin::zhao-sso.sso-user'>;
  };
}

export interface PluginZhaoSsoSsoLoginLog extends Struct.CollectionTypeSchema {
  collectionName: 'sso_login_logs';
  info: {
    displayName: 'SSO Login Log';
    pluralName: 'sso-login-logs';
    singularName: 'sso-login-log';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    app_code: Schema.Attribute.String;
    channel_code: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    fail_reason: Schema.Attribute.String;
    ip: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-login-log'
    > &
      Schema.Attribute.Private;
    login_type: Schema.Attribute.String & Schema.Attribute.Required;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    success: Schema.Attribute.Boolean & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<'manyToOne', 'plugin::zhao-sso.sso-user'>;
    user_agent: Schema.Attribute.String;
  };
}

export interface PluginZhaoSsoSsoOauthConfig
  extends Struct.CollectionTypeSchema {
  collectionName: 'sso_oauth_configs';
  info: {
    displayName: 'SSO OAuth Config';
    pluralName: 'sso-oauth-configs';
    singularName: 'sso-oauth-config';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    app_id: Schema.Attribute.String & Schema.Attribute.Required;
    app_secret: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    extra_config: Schema.Attribute.JSON;
    is_enabled: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-oauth-config'
    > &
      Schema.Attribute.Private;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    redirect_uris: Schema.Attribute.JSON;
    scope: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoSsoSsoReferralRelation
  extends Struct.CollectionTypeSchema {
  collectionName: 'sso_referral_relations';
  info: {
    displayName: 'SSO Referral Relation';
    pluralName: 'sso-referral-relations';
    singularName: 'sso-referral-relation';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    channel_code: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    invite_code: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-sso.sso-invite-code'
    >;
    invitee: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-sso.sso-user'
    >;
    inviter: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-sso.sso-user'
    >;
    level: Schema.Attribute.Integer & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-referral-relation'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoSsoSsoSmsCode extends Struct.CollectionTypeSchema {
  collectionName: 'sso_sms_codes';
  info: {
    displayName: 'SSO SMS Code';
    pluralName: 'sso-sms-codes';
    singularName: 'sso-sms-code';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    expires_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    ip: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-sms-code'
    > &
      Schema.Attribute.Private;
    mobile: Schema.Attribute.String & Schema.Attribute.Required;
    provider: Schema.Attribute.String & Schema.Attribute.DefaultTo<'mock'>;
    publishedAt: Schema.Attribute.DateTime;
    scene: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'login'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    used: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
  };
}

export interface PluginZhaoSsoSsoThirdPartyBinding
  extends Struct.CollectionTypeSchema {
  collectionName: 'sso_third_party_bindings';
  info: {
    displayName: 'SSO Third Party Binding';
    pluralName: 'sso-third-party-bindings';
    singularName: 'sso-third-party-binding';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bound_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-third-party-binding'
    > &
      Schema.Attribute.Private;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_avatar: Schema.Attribute.String;
    provider_data: Schema.Attribute.JSON;
    provider_nickname: Schema.Attribute.String;
    provider_union_id: Schema.Attribute.String;
    provider_user_id: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<'manyToOne', 'plugin::zhao-sso.sso-user'>;
  };
}

export interface PluginZhaoSsoSsoToken extends Struct.CollectionTypeSchema {
  collectionName: 'sso_tokens';
  info: {
    displayName: 'SSO Token';
    pluralName: 'sso-tokens';
    singularName: 'sso-token';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    access_token_jti: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    app_code: Schema.Attribute.String & Schema.Attribute.Required;
    channel_code: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-token'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    refresh_expires_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    refresh_token: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    revoked: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    revoked_at: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<'manyToOne', 'plugin::zhao-sso.sso-user'>;
  };
}

export interface PluginZhaoSsoSsoUser extends Struct.CollectionTypeSchema {
  collectionName: 'sso_users';
  info: {
    displayName: 'SSO User';
    pluralName: 'sso-users';
    singularName: 'sso-user';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    avatar_url: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email & Schema.Attribute.Unique;
    invite_code_used: Schema.Attribute.String;
    invited_by: Schema.Attribute.Integer;
    last_login_at: Schema.Attribute.DateTime;
    last_login_channel: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-user'
    > &
      Schema.Attribute.Private;
    login_count: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<0>;
    mobile: Schema.Attribute.String & Schema.Attribute.Unique;
    nickname: Schema.Attribute.String;
    password_changed_at: Schema.Attribute.DateTime;
    password_hash: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    register_channel: Schema.Attribute.String;
    status: Schema.Attribute.Enumeration<['active', 'blocked', 'inactive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    third_party_bindings: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-third-party-binding'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String & Schema.Attribute.Unique;
    utm_campaign: Schema.Attribute.String;
    utm_medium: Schema.Attribute.String;
    utm_source: Schema.Attribute.String;
    uuid: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
  };
}

export interface PluginZhaoSsoSsoUserAppRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'sso_user_app_roles';
  info: {
    displayName: 'SSO User App Role';
    pluralName: 'sso-user-app-roles';
    singularName: 'sso-user-app-role';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    app_code: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-sso.sso-user-app-role'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<'manyToOne', 'plugin::zhao-sso.sso-user'>;
  };
}

export interface PluginZhaoStudioAdSlot extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_ad_slots';
  info: {
    description: '\u5E7F\u544A\u4F4D\u914D\u7F6E\u7BA1\u7406';
    displayName: '\u5E7F\u544A\u4F4D';
    pluralName: 'ad-slots';
    singularName: 'ad-slot';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    browserLogs: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.browser-log'
    >;
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    imageUrl: Schema.Attribute.String;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.ad-slot'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    position: Schema.Attribute.Enumeration<
      [
        'article-content',
        'sidebar',
        'footer',
        'header',
        'list-page',
        'home-page',
      ]
    > &
      Schema.Attribute.DefaultTo<'article-content'>;
    productId: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    statSummaries: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.stat-summary'
    >;
    targetUrl: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<
      ['product-link', 'banner', 'popup', 'native']
    > &
      Schema.Attribute.DefaultTo<'product-link'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoStudioArticleDraft
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_article_drafts';
  info: {
    description: '\u91C7\u96C6\u5E76\u52A0\u5DE5\u540E\u7684\u8349\u7A3F\u6587\u7AE0';
    displayName: '\u8349\u7A3F\u6587\u7AE0';
    pluralName: 'article-drafts';
    singularName: 'article-draft';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    aiOptimizedTitle: Schema.Attribute.String;
    aiProcessed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    aiSummary: Schema.Attribute.Text;
    browserLogs: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.browser-log'
    >;
    category: Schema.Attribute.String;
    content: Schema.Attribute.RichText & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.article-draft'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    publishRecords: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.publish-record'
    >;
    scope: Schema.Attribute.Enumeration<['current', 'global', 'tenant']> &
      Schema.Attribute.DefaultTo<'current'>;
    scopeTenantId: Schema.Attribute.String;
    sourceAuthor: Schema.Attribute.String;
    sourcePublishedAt: Schema.Attribute.DateTime;
    sourceTitle: Schema.Attribute.String;
    sourceUrl: Schema.Attribute.String;
    statSummaries: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.stat-summary'
    >;
    status: Schema.Attribute.Enumeration<
      ['draft', 'processing', 'ready', 'published']
    > &
      Schema.Attribute.DefaultTo<'draft'>;
    syncEvents: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.sync-event'
    >;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    websiteArticles: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.article'
    >;
  };
}

export interface PluginZhaoStudioBrowserLog
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_browser_logs';
  info: {
    description: '\u7528\u6237\u6D4F\u89C8\u5668\u4FE1\u606F\u548C\u884C\u4E3A\u65E5\u5FD7';
    displayName: '\u6D4F\u89C8\u5668\u65E5\u5FD7';
    pluralName: 'browser-logs';
    singularName: 'browser-log';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    adSlot: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-studio.ad-slot'
    >;
    article: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-studio.article-draft'
    >;
    browser: Schema.Attribute.String;
    browserVersion: Schema.Attribute.String;
    city: Schema.Attribute.String;
    country: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceType: Schema.Attribute.Enumeration<['desktop', 'mobile', 'tablet']> &
      Schema.Attribute.DefaultTo<'desktop'>;
    eventType: Schema.Attribute.Enumeration<
      ['page-view', 'ad-click', 'scroll', 'read-duration', 'user-register']
    > &
      Schema.Attribute.Required;
    ip: Schema.Attribute.String;
    isRegistered: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    language: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.browser-log'
    > &
      Schema.Attribute.Private;
    os: Schema.Attribute.String;
    osVersion: Schema.Attribute.String;
    platform: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    readDuration: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    referrer: Schema.Attribute.String;
    referrerDomain: Schema.Attribute.String;
    registeredAt: Schema.Attribute.DateTime;
    screenHeight: Schema.Attribute.Integer;
    screenWidth: Schema.Attribute.Integer;
    scrollDepth: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    sessionId: Schema.Attribute.String & Schema.Attribute.Required;
    timestamp: Schema.Attribute.DateTime & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    userAgent: Schema.Attribute.String;
    userId: Schema.Attribute.String;
  };
}

export interface PluginZhaoStudioCollectSource
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_collect_sources';
  info: {
    description: '\u5185\u5BB9\u91C7\u96C6\u6E90\u914D\u7F6E';
    displayName: '\u91C7\u96C6\u6E90';
    pluralName: 'collect-sources';
    singularName: 'collect-source';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    authorSelector: Schema.Attribute.String;
    contentSelector: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dateSelector: Schema.Attribute.String;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    lastCollectedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.collect-source'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    tasks: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.collect-task'
    >;
    template: Schema.Attribute.String;
    titleSelector: Schema.Attribute.String;
    type: Schema.Attribute.Enumeration<['template', 'custom']> &
      Schema.Attribute.DefaultTo<'template'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PluginZhaoStudioCollectTask
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_collect_tasks';
  info: {
    description: '\u5185\u5BB9\u91C7\u96C6\u4EFB\u52A1\u4E34\u65F6\u72B6\u6001';
    displayName: '\u91C7\u96C6\u4EFB\u52A1';
    pluralName: 'collect-tasks';
    singularName: 'collect-task';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    error: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.collect-task'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    retryCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    selectedTitles: Schema.Attribute.JSON;
    source: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-studio.collect-source'
    >;
    status: Schema.Attribute.Enumeration<
      [
        'pending',
        'fetching_titles',
        'waiting_selection',
        'fetching_content',
        'completed',
        'failed',
      ]
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    titles: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoStudioKnowledgePointIndex
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_knowledge_point_indices';
  info: {
    description: '\u6587\u7AE0\u4E0E\u77E5\u8BC6\u70B9\u7684\u5173\u8054\u7D22\u5F15';
    displayName: '\u77E5\u8BC6\u70B9\u7D22\u5F15';
    pluralName: 'knowledge-point-indices';
    singularName: 'knowledge-point-index';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    knowledgePoint: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-tag.knowledge-point'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.knowledge-point-index'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    targetId: Schema.Attribute.String & Schema.Attribute.Required;
    targetType: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoStudioPublishAccount
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_publish_accounts';
  info: {
    description: '\u53D1\u5E03\u8D26\u53F7\u914D\u7F6E\uFF08\u4E00\u4E2A\u5E73\u53F0\u53EF\u6709\u591A\u4E2A\u8D26\u53F7\uFF09';
    displayName: '\u53D1\u5E03\u8D26\u53F7';
    pluralName: 'publish-accounts';
    singularName: 'publish-account';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    config: Schema.Attribute.JSON;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    lastPublishedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.publish-account'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    platform: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-studio.publish-platform'
    >;
    publishedAt: Schema.Attribute.DateTime;
    publishRecords: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.publish-record'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoStudioPublishPlatform
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_publish_platforms';
  info: {
    description: '\u53D1\u5E03\u5E73\u53F0\u7C7B\u578B\u914D\u7F6E';
    displayName: '\u53D1\u5E03\u5E73\u53F0';
    pluralName: 'publish-platforms';
    singularName: 'publish-platform';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    accounts: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.publish-account'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.publish-platform'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<
      ['toutiao', 'xiaohongshu', 'wechat', 'custom', 'internal']
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoStudioPublishRecord
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_publish_records';
  info: {
    description: '\u6587\u7AE0\u53D1\u5E03\u5230\u8D26\u53F7\u7684\u8BB0\u5F55';
    displayName: '\u53D1\u5E03\u8BB0\u5F55';
    pluralName: 'publish-records';
    singularName: 'publish-record';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    account: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-studio.publish-account'
    >;
    article: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-studio.article-draft'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    error: Schema.Attribute.Text;
    externalId: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.publish-record'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    retryCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    status: Schema.Attribute.Enumeration<['pending', 'success', 'failed']> &
      Schema.Attribute.DefaultTo<'pending'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoStudioStatSummary
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_stat_summaries';
  info: {
    description: '\u6309\u65E5\u671F\u805A\u5408\u7684\u7EDF\u8BA1\u6570\u636E';
    displayName: '\u7EDF\u8BA1\u6C47\u603B';
    pluralName: 'stat-summaries';
    singularName: 'stat-summary';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    adSlot: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-studio.ad-slot'
    >;
    article: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-studio.article-draft'
    >;
    avgReadDuration: Schema.Attribute.Float & Schema.Attribute.DefaultTo<0>;
    avgScrollDepth: Schema.Attribute.Float & Schema.Attribute.DefaultTo<0>;
    clickCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    clickRate: Schema.Attribute.Float & Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    date: Schema.Attribute.Date & Schema.Attribute.Required;
    deviceStats: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.stat-summary'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    pv: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    referrerStats: Schema.Attribute.JSON;
    regionStats: Schema.Attribute.JSON;
    summaryType: Schema.Attribute.Enumeration<
      [
        'article-daily',
        'ad-slot-daily',
        'global-daily',
        'device-daily',
        'region-daily',
      ]
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    uv: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface PluginZhaoStudioSyncEvent extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_studio_sync_events';
  info: {
    displayName: '\u540C\u6B65\u4E8B\u4EF6';
    pluralName: 'sync-events';
    singularName: 'sync-event';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    eventPayload: Schema.Attribute.JSON;
    eventStatus: Schema.Attribute.Enumeration<
      ['pending', 'resolved', 'ignored']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-studio.sync-event'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    resolvedAt: Schema.Attribute.DateTime;
    resolvedBy: Schema.Attribute.String;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    sourceContentType: Schema.Attribute.String & Schema.Attribute.Required;
    sourceDocumentId: Schema.Attribute.String;
    sourceTitle: Schema.Attribute.String;
    sourceType: Schema.Attribute.Enumeration<['website']> &
      Schema.Attribute.Required;
    sourceUrl: Schema.Attribute.String;
    targetDraftId: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-studio.article-draft'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoTagKnowledgePoint
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_knowledge_points';
  info: {
    displayName: '\u77E5\u8BC6\u70B9';
    pluralName: 'knowledge-points';
    singularName: 'knowledge-point';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    children: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.knowledge-point'
    >;
    code: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    level: Schema.Attribute.Enumeration<['basic', 'intermediate', 'advanced']> &
      Schema.Attribute.DefaultTo<'basic'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.knowledge-point'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    parent: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-tag.knowledge-point'
    >;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'>;
    sort: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoTagTag extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_tags';
  info: {
    displayName: '\u6807\u7B7E';
    pluralName: 'tags';
    singularName: 'tag';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::zhao-tag.tag'>;
    color: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.Media;
    indexes: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.tag-index'
    >;
    isPreset: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isPublic: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.tag'
    >;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::zhao-tag.tag'>;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    >;
    slug: Schema.Attribute.UID<'name'>;
    sort: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    tagGroup: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-tag.tag-group'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    website_articles: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.article'
    >;
    website_cases: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.case'
    >;
    website_compliances: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.compliance'
    >;
    website_downloads: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.download'
    >;
    website_faqs: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.faq'
    >;
    website_products: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.product'
    >;
    website_tutorials: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.tutorial'
    >;
  };
}

export interface PluginZhaoTagTagGroup extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_tag_groups';
  info: {
    displayName: '\u6807\u7B7E\u5206\u7EC4';
    pluralName: 'tag-groups';
    singularName: 'tag-group';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.tag-group'
    >;
    color: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.Media;
    isPublic: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.tag-group'
    >;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    parent: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-tag.tag-group'
    >;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    >;
    slug: Schema.Attribute.UID<'name'>;
    sort: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    tags: Schema.Attribute.Relation<'oneToMany', 'plugin::zhao-tag.tag'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoTagTagIndex extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_tag_indexes';
  info: {
    displayName: '\u6807\u7B7E\u7D22\u5F15';
    pluralName: 'tag-indexes';
    singularName: 'tag-index';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.tag-index'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    tag: Schema.Attribute.Relation<'manyToOne', 'plugin::zhao-tag.tag'>;
    targetId: Schema.Attribute.String & Schema.Attribute.Required;
    targetType: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoThirdThirdPartyAccount
  extends Struct.CollectionTypeSchema {
  collectionName: 'third_party_accounts';
  info: {
    displayName: '\u4E09\u65B9\u8D26\u53F7\u7ED1\u5B9A';
    pluralName: 'third-party-accounts';
    singularName: 'third-party-account';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
  };
  attributes: {
    appType: Schema.Attribute.Enumeration<
      ['official_account', 'mini_program', 'open_platform', 'h5', 'app']
    > &
      Schema.Attribute.Required;
    avatar: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-third.third-party-account'
    > &
      Schema.Attribute.Private;
    nickname: Schema.Attribute.String;
    openId: Schema.Attribute.String & Schema.Attribute.Required;
    platform: Schema.Attribute.Enumeration<['wechat', 'alipay', 'douyin']> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    unionId: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginZhaoThirdThirdPartyConfig
  extends Struct.CollectionTypeSchema {
  collectionName: 'third_party_configs';
  info: {
    displayName: '\u4E09\u65B9\u767B\u5F55\u914D\u7F6E';
    pluralName: 'third-party-configs';
    singularName: 'third-party-config';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
  };
  attributes: {
    appId: Schema.Attribute.String & Schema.Attribute.Required;
    appSecret: Schema.Attribute.String & Schema.Attribute.Required;
    appType: Schema.Attribute.Enumeration<
      ['official_account', 'mini_program', 'open_platform', 'h5', 'app']
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-third.third-party-config'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    platform: Schema.Attribute.Enumeration<['wechat', 'alipay', 'douyin']> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoWealthWealthAnnualSnapshot
  extends Struct.CollectionTypeSchema {
  collectionName: 'wealth_annual_snapshots';
  info: {
    description: '\u5404\u5468\u671F\u5E74\u5316\u6536\u76CA\u5FEB\u7167';
    displayName: '\u5E74\u5316\u5FEB\u7167';
    pluralName: 'wealth-annual-snapshots';
    singularName: 'wealth-annual-snapshot';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    annual1d: Schema.Attribute.Decimal;
    annual1m: Schema.Attribute.Decimal;
    annual1y: Schema.Attribute.Decimal;
    annual2w: Schema.Attribute.Decimal;
    annual3d: Schema.Attribute.Decimal;
    annual3m: Schema.Attribute.Decimal;
    annual6m: Schema.Attribute.Decimal;
    annual7d: Schema.Attribute.Decimal;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    isEstimate: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-annual-snapshot'
    > &
      Schema.Attribute.Private;
    product: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-wealth.wealth-product'
    >;
    publishedAt: Schema.Attribute.DateTime;
    snapshotDate: Schema.Attribute.Date & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoWealthWealthCollectConfig
  extends Struct.CollectionTypeSchema {
  collectionName: 'wealth_collect_configs';
  info: {
    description: '\u4EA7\u54C1\u6570\u636E\u91C7\u96C6\u914D\u7F6E';
    displayName: '\u91C7\u96C6\u914D\u7F6E';
    pluralName: 'wealth-collect-configs';
    singularName: 'wealth-collect-config';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    collectMethod: Schema.Attribute.Enumeration<
      ['web-crawler', 'zip-pdf', 'manual', 'api']
    > &
      Schema.Attribute.DefaultTo<'web-crawler'>;
    collectRules: Schema.Attribute.JSON;
    collectStatus: Schema.Attribute.Enumeration<
      ['pending', 'success', 'failed']
    > &
      Schema.Attribute.DefaultTo<'pending'>;
    collectUrl: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    failCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    failReason: Schema.Attribute.Text;
    lastCollectTime: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-collect-config'
    > &
      Schema.Attribute.Private;
    product: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::zhao-wealth.wealth-product'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoWealthWealthCompany
  extends Struct.CollectionTypeSchema {
  collectionName: 'wealth_companies';
  info: {
    description: '\u94F6\u884C\u7406\u8D22\u516C\u53F8\u4FE1\u606F\u7BA1\u7406';
    displayName: '\u7406\u8D22\u516C\u53F8';
    pluralName: 'wealth-companies';
    singularName: 'wealth-company';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    companyType: Schema.Attribute.Enumeration<
      ['bank', 'bank-subsidiary', 'joint-venture']
    > &
      Schema.Attribute.DefaultTo<'bank-subsidiary'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-company'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    products: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-product'
    >;
    publishedAt: Schema.Attribute.DateTime;
    shortName: Schema.Attribute.String;
    status: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    website: Schema.Attribute.String;
  };
}

export interface PluginZhaoWealthWealthCustomerProduct
  extends Struct.CollectionTypeSchema {
  collectionName: 'wealth_customer_products';
  info: {
    description: '\u5BA2\u6237\u5173\u6CE8\u7684\u4EA7\u54C1\u5217\u8868';
    displayName: '\u5BA2\u6237\u81EA\u9009\u4EA7\u54C1';
    pluralName: 'wealth-customer-products';
    singularName: 'wealth-customer-product';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    channel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    followTime: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-customer-product'
    > &
      Schema.Attribute.Private;
    product: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-wealth.wealth-product'
    >;
    publishedAt: Schema.Attribute.DateTime;
    remark: Schema.Attribute.String;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginZhaoWealthWealthMoneyIncome
  extends Struct.CollectionTypeSchema {
  collectionName: 'wealth_money_incomes';
  info: {
    description: '\u8D27\u5E01\u57FA\u91D1\u4E07\u4EFD\u6536\u76CA\u6570\u636E';
    displayName: '\u8D27\u5E01\u57FA\u91D1\u6536\u76CA';
    pluralName: 'wealth-money-incomes';
    singularName: 'wealth-money-income';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dataSource: Schema.Attribute.Enumeration<['crawler', 'manual']> &
      Schema.Attribute.DefaultTo<'crawler'>;
    incomeDate: Schema.Attribute.Date & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-money-income'
    > &
      Schema.Attribute.Private;
    product: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-wealth.wealth-product'
    >;
    publishedAt: Schema.Attribute.DateTime;
    sevenDayAnnual: Schema.Attribute.Decimal;
    tenThousandIncome: Schema.Attribute.Decimal;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoWealthWealthNav extends Struct.CollectionTypeSchema {
  collectionName: 'wealth_navs';
  info: {
    description: '\u7406\u8D22/\u57FA\u91D1\u51C0\u503C\u6570\u636E\uFF08\u4E0D\u542B\u8D27\u5E01\u57FA\u91D1\uFF09';
    displayName: '\u51C0\u503C\u6570\u636E';
    pluralName: 'wealth-navs';
    singularName: 'wealth-nav';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    accNav: Schema.Attribute.Decimal;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dataSource: Schema.Attribute.Enumeration<['crawler', 'manual']> &
      Schema.Attribute.DefaultTo<'crawler'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-nav'
    > &
      Schema.Attribute.Private;
    navDate: Schema.Attribute.Date & Schema.Attribute.Required;
    product: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-wealth.wealth-product'
    >;
    publishedAt: Schema.Attribute.DateTime;
    unitNav: Schema.Attribute.Decimal;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoWealthWealthProduct
  extends Struct.CollectionTypeSchema {
  collectionName: 'wealth_products';
  info: {
    description: '\u7406\u8D22/\u57FA\u91D1\u4EA7\u54C1\u4FE1\u606F';
    displayName: '\u7406\u8D22\u4EA7\u54C1';
    pluralName: 'wealth-products';
    singularName: 'wealth-product';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    annualSnapshots: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-annual-snapshot'
    >;
    benchmark: Schema.Attribute.String;
    company: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-wealth.wealth-company'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    issueDate: Schema.Attribute.Date;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-product'
    > &
      Schema.Attribute.Private;
    maturityDate: Schema.Attribute.Date;
    moneyIncomes: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-money-income'
    >;
    navs: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-nav'
    >;
    productCode: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    productName: Schema.Attribute.String & Schema.Attribute.Required;
    productType: Schema.Attribute.Enumeration<
      ['bank-wealth', 'stock-fund', 'bond-fund', 'mixed-fund', 'money-fund']
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    recommendEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    recommendReason: Schema.Attribute.Text;
    recommendTags: Schema.Attribute.JSON;
    recommendWeight: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    registerCode: Schema.Attribute.String & Schema.Attribute.Unique;
    remark: Schema.Attribute.Text;
    riskLevel: Schema.Attribute.Enumeration<['R1', 'R2', 'R3', 'R4', 'R5']> &
      Schema.Attribute.DefaultTo<'R2'>;
    riskMetrics: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-risk-metric'
    >;
    status: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    termType: Schema.Attribute.Enumeration<['short', 'medium', 'long']>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    yearlyReturns: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-yearly-return'
    >;
  };
}

export interface PluginZhaoWealthWealthRecommendConfig
  extends Struct.CollectionTypeSchema {
  collectionName: 'wealth_recommend_configs';
  info: {
    description: '\u624B\u52A8\u63A8\u8350\u4EA7\u54C1\u914D\u7F6E';
    displayName: '\u63A8\u8350\u914D\u7F6E';
    pluralName: 'wealth-recommend-configs';
    singularName: 'wealth-recommend-config';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    channel: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-channel.channel'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-recommend-config'
    > &
      Schema.Attribute.Private;
    product: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::zhao-wealth.wealth-product'
    >;
    publishedAt: Schema.Attribute.DateTime;
    recommendOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    recommendReason: Schema.Attribute.Text;
    status: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoWealthWealthRiskMetric
  extends Struct.CollectionTypeSchema {
  collectionName: 'wealth_risk_metrics';
  info: {
    description: '\u4E1A\u7EE9\u5F52\u56E0\u6307\u6807\uFF08\u6CE2\u52A8\u7387/\u6700\u5927\u56DE\u64A4/\u590F\u666E/\u540C\u7C7B\u6392\u540D\uFF09';
    displayName: '\u98CE\u9669\u6307\u6807';
    pluralName: 'wealth-risk-metrics';
    singularName: 'wealth-risk-metric';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-risk-metric'
    > &
      Schema.Attribute.Private;
    metricName: Schema.Attribute.Enumeration<
      ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile']
    > &
      Schema.Attribute.Required;
    metricValue: Schema.Attribute.Decimal;
    period: Schema.Attribute.Enumeration<['m1', 'm3', 'm6', 'y1']> &
      Schema.Attribute.Required;
    product: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-wealth.wealth-product'
    >;
    publishedAt: Schema.Attribute.DateTime;
    snapshotDate: Schema.Attribute.Date & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoWealthWealthYearlyReturn
  extends Struct.CollectionTypeSchema {
  collectionName: 'wealth_yearly_returns';
  info: {
    description: '\u5386\u5E74\u5E74\u5EA6\u6536\u76CA\u7EDF\u8BA1';
    displayName: '\u5E74\u5EA6\u6536\u76CA';
    pluralName: 'wealth-yearly-returns';
    singularName: 'wealth-yearly-return';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    annualReturn: Schema.Attribute.Decimal;
    baseDays: Schema.Attribute.Integer;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-wealth.wealth-yearly-return'
    > &
      Schema.Attribute.Private;
    product: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-wealth.wealth-product'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    year: Schema.Attribute.Integer & Schema.Attribute.Required;
  };
}

export interface PluginZhaoWebsiteAiContentSummary
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_ai_summaries';
  info: {
    displayName: '\u673A\u5668\u53EF\u8BFB\u6458\u8981';
    pluralName: 'ai-content-summaries';
    singularName: 'ai-content-summary';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    aiModel: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    aiProvider: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    content: Schema.Attribute.JSON & Schema.Attribute.Required;
    contentText: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    generatedAt: Schema.Attribute.DateTime;
    generatedBy: Schema.Attribute.Enumeration<
      ['manual', 'ai_assisted', 'ai_generated', 'hybrid']
    > &
      Schema.Attribute.DefaultTo<'manual'>;
    language: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }> &
      Schema.Attribute.DefaultTo<'zh-CN'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.ai-content-summary'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    status: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    summaryType: Schema.Attribute.Enumeration<
      [
        'tldr',
        'key_facts',
        'faq',
        'qa_pairs',
        'technical_spec',
        'executive_brief',
        'comparison',
        'howto',
      ]
    > &
      Schema.Attribute.Required;
    targetId: Schema.Attribute.String & Schema.Attribute.Required;
    targetType: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 30;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    verificationStatus: Schema.Attribute.Enumeration<
      ['verified', 'pending', 'outdated', 'conflict']
    > &
      Schema.Attribute.DefaultTo<'verified'>;
    verifiedAt: Schema.Attribute.DateTime;
    version: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
  };
}

export interface PluginZhaoWebsiteArticle extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_articles';
  info: {
    displayName: '\u8D44\u8BAF\u6587\u7AE0';
    pluralName: 'articles';
    singularName: 'article';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    allowIndex: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    author: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    authorTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    brandVoiceRef: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.brand-voice'
    >;
    canonicalUrl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    category: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.article-category'
    >;
    collectCount: Schema.Attribute.BigInteger & Schema.Attribute.DefaultTo<0>;
    content: Schema.Attribute.Text & Schema.Attribute.Required;
    coverImage: Schema.Attribute.Media;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    excerpt: Schema.Attribute.Text;
    isFeatured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isPinned: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    likeCount: Schema.Attribute.BigInteger & Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.article'
    >;
    mainEntity: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.knowledge-entity'
    >;
    mentionedEntities: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.knowledge-entity'
    >;
    noFollow: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    ogDescription: Schema.Attribute.Text;
    ogImage: Schema.Attribute.Media;
    ogTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    ogType: Schema.Attribute.Enumeration<
      ['article', 'product', 'website', 'video']
    > &
      Schema.Attribute.DefaultTo<'article'>;
    publishedAt: Schema.Attribute.DateTime;
    readingTime: Schema.Attribute.Integer;
    schemaJson: Schema.Attribute.JSON;
    schemaType: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    seoDescription: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    seoKeywords: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    seoTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    shareCount: Schema.Attribute.BigInteger & Schema.Attribute.DefaultTo<0>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    sitemapFrequency: Schema.Attribute.Enumeration<
      ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
    > &
      Schema.Attribute.DefaultTo<'weekly'>;
    sitemapPriority: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0.7>;
    slug: Schema.Attribute.UID<'title'> & Schema.Attribute.Required;
    sourceArticleDraft: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-studio.article-draft'
    >;
    sourceType: Schema.Attribute.Enumeration<
      ['original', 'studio', 'external']
    > &
      Schema.Attribute.DefaultTo<'original'>;
    sourceUrl: Schema.Attribute.String;
    status: Schema.Attribute.Enumeration<['draft', 'published', 'archived']> &
      Schema.Attribute.DefaultTo<'draft'>;
    structuredData: Schema.Attribute.JSON;
    tags: Schema.Attribute.Relation<'manyToMany', 'plugin::zhao-tag.tag'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    twitterCard: Schema.Attribute.Enumeration<
      ['summary', 'summary_large_image', 'product']
    > &
      Schema.Attribute.DefaultTo<'summary_large_image'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    viewCount: Schema.Attribute.BigInteger & Schema.Attribute.DefaultTo<0>;
    wordCount: Schema.Attribute.Integer;
  };
}

export interface PluginZhaoWebsiteArticleCategory
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_article_categories';
  info: {
    displayName: '\u6587\u7AE0\u5206\u7C7B';
    pluralName: 'article-categories';
    singularName: 'article-category';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    articles: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.article'
    >;
    children: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.article-category'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    downloads: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.download'
    >;
    faqs: Schema.Attribute.Relation<'oneToMany', 'plugin::zhao-website.faq'>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.article-category'
    >;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    parent: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.article-category'
    >;
    products: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.product'
    >;
    publishedAt: Schema.Attribute.DateTime;
    seoDescription: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    seoTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required;
    status: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    tutorials: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.tutorial'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoWebsiteBrandInfo
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_brand_infos';
  info: {
    displayName: '\u4F01\u4E1A\u54C1\u724C\u4FE1\u606F';
    pluralName: 'brand-infos';
    singularName: 'brand-info';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    businessHours: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    businessScope: Schema.Attribute.Text;
    certificates: Schema.Attribute.JSON;
    companyName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    contactEmail: Schema.Attribute.Email;
    contactPhone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 30;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    favicon: Schema.Attribute.Media;
    foundingDate: Schema.Attribute.Date;
    legalRepresentative: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.brand-info'
    >;
    logo: Schema.Attribute.Media;
    logoDark: Schema.Attribute.Media;
    mainEntity: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.knowledge-entity'
    >;
    miniProgramName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    officeAddress: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    offices: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    registeredAddress: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    registeredCapital: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    serviceHotline: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 30;
      }>;
    shortName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    site: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    slogan: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    socialLinks: Schema.Attribute.JSON;
    unifiedSocialCreditCode: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    wechatPublicAccount: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    wechatQrCode: Schema.Attribute.Media;
  };
}

export interface PluginZhaoWebsiteBrandVoice
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_brand_voices';
  info: {
    displayName: '\u54C1\u724C\u8BDD\u672F';
    pluralName: 'brand-voices';
    singularName: 'brand-voice';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    articles: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.article'
    >;
    category: Schema.Attribute.Enumeration<
      ['tone', 'style', 'phrase', 'disclaimer', 'cta']
    > &
      Schema.Attribute.Required;
    content: Schema.Attribute.RichText & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.brand-voice'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    >;
    status: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    tags: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    variables: Schema.Attribute.JSON;
  };
}

export interface PluginZhaoWebsiteCase extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_cases';
  info: {
    displayName: '\u843D\u5730\u6848\u4F8B';
    pluralName: 'cases';
    singularName: 'case';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    allowIndex: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    challenge: Schema.Attribute.Text & Schema.Attribute.Required;
    clientDescription: Schema.Attribute.Text;
    clientIndustry: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    clientLogo: Schema.Attribute.Media;
    clientName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    coverImage: Schema.Attribute.Media;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    images: Schema.Attribute.Media<undefined, true>;
    isFeatured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.case'
    >;
    mainEntity: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.knowledge-entity'
    >;
    mentionedEntities: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.knowledge-entity'
    >;
    publishedAt: Schema.Attribute.DateTime;
    relatedProducts: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.product'
    >;
    results: Schema.Attribute.JSON & Schema.Attribute.Required;
    seoDescription: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    seoTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    slug: Schema.Attribute.UID<'title'> & Schema.Attribute.Required;
    solution: Schema.Attribute.Text & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<['draft', 'published', 'archived']> &
      Schema.Attribute.DefaultTo<'draft'>;
    structuredData: Schema.Attribute.JSON;
    tags: Schema.Attribute.Relation<'manyToMany', 'plugin::zhao-tag.tag'>;
    testimonial: Schema.Attribute.Text;
    testimonialAuthor: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    testimonialTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    viewCount: Schema.Attribute.BigInteger & Schema.Attribute.DefaultTo<0>;
  };
}

export interface PluginZhaoWebsiteCompliance
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_compliances';
  info: {
    displayName: '\u5408\u89C4\u516C\u793A';
    pluralName: 'compliances';
    singularName: 'compliance';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    allowIndex: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    category: Schema.Attribute.Enumeration<
      ['notice', 'policy', 'report', 'certificate', 'agreement']
    > &
      Schema.Attribute.Required;
    content: Schema.Attribute.Text & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    effectiveDate: Schema.Attribute.Date;
    expiryDate: Schema.Attribute.Date;
    isPinned: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.compliance'
    >;
    publishedAt: Schema.Attribute.DateTime;
    seoDescription: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    seoTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    slug: Schema.Attribute.UID<'title'> & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<['draft', 'published', 'archived']> &
      Schema.Attribute.DefaultTo<'draft'>;
    tags: Schema.Attribute.Relation<'manyToMany', 'plugin::zhao-tag.tag'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoWebsiteDownload extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_downloads';
  info: {
    displayName: '\u4E0B\u8F7D\u6587\u4EF6\u7BA1\u7406';
    pluralName: 'downloads';
    singularName: 'download';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    category: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.article-category'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    downloadCount: Schema.Attribute.BigInteger & Schema.Attribute.DefaultTo<0>;
    file: Schema.Attribute.Media & Schema.Attribute.Required;
    fileSize: Schema.Attribute.BigInteger;
    fileType: Schema.Attribute.Enumeration<
      [
        'whitepaper',
        'brochure',
        'datasheet',
        'template',
        'guide',
        'certificate',
        'other',
      ]
    > &
      Schema.Attribute.DefaultTo<'other'>;
    isFeatured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.download'
    >;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    relatedContentId: Schema.Attribute.String;
    relatedContentType: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 30;
      }>;
    requireLead: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<['draft', 'published', 'archived']> &
      Schema.Attribute.DefaultTo<'draft'>;
    tags: Schema.Attribute.Relation<'manyToMany', 'plugin::zhao-tag.tag'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoWebsiteFaq extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_faqs';
  info: {
    displayName: '\u5E38\u89C1\u95EE\u7B54';
    pluralName: 'faqs';
    singularName: 'faq';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required;
    category: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.article-category'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    isFeatured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.faq'
    >;
    mainEntity: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.knowledge-entity'
    >;
    mentionedEntities: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.knowledge-entity'
    >;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    question: Schema.Attribute.Text & Schema.Attribute.Required;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    slug: Schema.Attribute.UID<'question'> & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<['draft', 'published', 'archived']> &
      Schema.Attribute.DefaultTo<'draft'>;
    tags: Schema.Attribute.Relation<'manyToMany', 'plugin::zhao-tag.tag'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    viewCount: Schema.Attribute.BigInteger & Schema.Attribute.DefaultTo<0>;
  };
}

export interface PluginZhaoWebsiteFirstTruthPolicy
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_first_truths';
  info: {
    displayName: '\u7B2C\u4E00\u771F\u503C\u7B56\u7565\u58F0\u660E';
    pluralName: 'first-truth-policies';
    singularName: 'first-truth-policy';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    canonicalEntity: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.knowledge-entity'
    >;
    canonicalSourceType: Schema.Attribute.Enumeration<
      ['government', 'official_site', 'third_party_verified', 'internal']
    > &
      Schema.Attribute.DefaultTo<'official_site'>;
    canonicalSourceUrl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    canonicalValue: Schema.Attribute.Text & Schema.Attribute.Required;
    canonicalValueType: Schema.Attribute.Enumeration<
      ['text', 'number', 'date', 'url', 'json']
    > &
      Schema.Attribute.DefaultTo<'text'>;
    claim: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    claimCategory: Schema.Attribute.Enumeration<
      [
        'business_license',
        'brand_claim',
        'technical_spec',
        'certification',
        'financial',
        'logistics_promise',
        'other',
      ]
    > &
      Schema.Attribute.DefaultTo<'brand_claim'>;
    claimKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    conflictDetails: Schema.Attribute.JSON;
    conflictResolution: Schema.Attribute.Enumeration<
      ['latest', 'earliest', 'highest_confidence', 'manual']
    > &
      Schema.Attribute.DefaultTo<'manual'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    lastVerifiedAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.first-truth-policy'
    > &
      Schema.Attribute.Private;
    priority: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<100>;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    >;
    status: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    verificationStatus: Schema.Attribute.Enumeration<
      ['verified', 'pending', 'outdated', 'conflict']
    > &
      Schema.Attribute.DefaultTo<'verified'>;
  };
}

export interface PluginZhaoWebsiteInteraction
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_interactions';
  info: {
    displayName: '\u5185\u5BB9\u4E92\u52A8\u8BB0\u5F55';
    pluralName: 'interactions';
    singularName: 'interaction';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    ipAddress: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.interaction'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    targetId: Schema.Attribute.String & Schema.Attribute.Required;
    targetType: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 30;
      }>;
    type: Schema.Attribute.Enumeration<['like', 'collect', 'share']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userAgent: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    userId: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    visitorId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
  };
}

export interface PluginZhaoWebsiteKnowledgeEntity
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_knowledge_entities';
  info: {
    displayName: '\u77E5\u8BC6\u56FE\u8C31\u5B9E\u4F53';
    pluralName: 'knowledge-entities';
    singularName: 'knowledge-entity';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    articleMainEntities: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.article'
    >;
    articleMentions: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.article'
    >;
    brandInfos: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.brand-info'
    >;
    caseMainEntities: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.case'
    >;
    caseMentions: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.case'
    >;
    confidence: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<1>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    entityType: Schema.Attribute.Enumeration<
      [
        'Organization',
        'Person',
        'Product',
        'Service',
        'Place',
        'Event',
        'CreativeWork',
        'Article',
        'CaseStudy',
        'Offer',
        'Review',
        'FAQ',
        'HowTo',
        'BreadcrumbList',
        'Brand',
        'ContactPoint',
        'QuantitativeValue',
        'DefinedTerm',
      ]
    > &
      Schema.Attribute.Required;
    faqMainEntities: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.faq'
    >;
    faqMentions: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.faq'
    >;
    firstTruthPolicies: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.first-truth-policy'
    >;
    identifier: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    image: Schema.Attribute.Media;
    lastVerifiedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.knowledge-entity'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    objectRelations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.knowledge-relation'
    >;
    productMainEntities: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.product'
    >;
    productMentions: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.product'
    >;
    properties: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    refTargetId: Schema.Attribute.String;
    refTargetType: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 30;
      }>;
    sameAs: Schema.Attribute.JSON;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    >;
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required;
    sourceType: Schema.Attribute.Enumeration<
      ['official', 'derived', 'manual', 'imported']
    > &
      Schema.Attribute.DefaultTo<'official'>;
    status: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    subjectRelations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.knowledge-relation'
    >;
    tutorialMainEntities: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.tutorial'
    >;
    tutorialMentions: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.tutorial'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    verificationStatus: Schema.Attribute.Enumeration<
      ['verified', 'pending', 'outdated', 'conflict']
    > &
      Schema.Attribute.DefaultTo<'verified'>;
    verifiedBy: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
  };
}

export interface PluginZhaoWebsiteKnowledgeRelation
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_knowledge_relations';
  info: {
    displayName: '\u77E5\u8BC6\u56FE\u8C31\u5173\u7CFB';
    pluralName: 'knowledge-relations';
    singularName: 'knowledge-relation';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    confidence: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<1>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    lastVerifiedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.knowledge-relation'
    > &
      Schema.Attribute.Private;
    objectEntity: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.knowledge-entity'
    >;
    objectText: Schema.Attribute.Text;
    objectValue: Schema.Attribute.JSON;
    predicate: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    sourceType: Schema.Attribute.Enumeration<
      ['official', 'derived', 'manual', 'inferred']
    > &
      Schema.Attribute.DefaultTo<'manual'>;
    sourceUrl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    status: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    subjectEntity: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.knowledge-entity'
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    verificationStatus: Schema.Attribute.Enumeration<
      ['verified', 'pending', 'outdated', 'conflict']
    > &
      Schema.Attribute.DefaultTo<'verified'>;
  };
}

export interface PluginZhaoWebsiteLead extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_leads';
  info: {
    displayName: '\u7EBF\u7D22/\u7559\u8D44';
    pluralName: 'leads';
    singularName: 'lead';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    assignedTo: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    contactCompany: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    contactEmail: Schema.Attribute.Email;
    contactName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    contactPhone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 30;
      }>;
    contactTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    convertedAt: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    downloadFileId: Schema.Attribute.String;
    followUpRecords: Schema.Attribute.JSON;
    ipAddress: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.lead'
    > &
      Schema.Attribute.Private;
    message: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    referralCode: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    referrer: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    remark: Schema.Attribute.Text;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    sourceId: Schema.Attribute.String;
    sourceType: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 30;
      }>;
    sourceUrl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    status: Schema.Attribute.Enumeration<
      ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'invalid']
    > &
      Schema.Attribute.DefaultTo<'new'>;
    type: Schema.Attribute.Enumeration<
      [
        'contact',
        'download',
        'quote',
        'appointment',
        'demo',
        'partner',
        'intent_order',
        'referral',
      ]
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userAgent: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    utmCampaign: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    utmContent: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    utmMedium: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmSource: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmTerm: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
  };
}

export interface PluginZhaoWebsiteProduct extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_products';
  info: {
    displayName: '\u4EA7\u54C1/\u65B9\u6848';
    pluralName: 'products';
    singularName: 'product';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    allowIndex: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    canonicalUrl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    cases: Schema.Attribute.Relation<'manyToMany', 'plugin::zhao-website.case'>;
    category: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.article-category'
    >;
    content: Schema.Attribute.Text;
    coverImage: Schema.Attribute.Media;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    features: Schema.Attribute.JSON;
    images: Schema.Attribute.Media<undefined, true>;
    isFeatured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.product'
    >;
    mainEntity: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.knowledge-entity'
    >;
    mentionedEntities: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.knowledge-entity'
    >;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    ogImage: Schema.Attribute.Media;
    priceRange: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    priceUnit: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    scenarios: Schema.Attribute.JSON;
    seoDescription: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    seoKeywords: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    seoTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    sitemapFrequency: Schema.Attribute.Enumeration<
      ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
    > &
      Schema.Attribute.DefaultTo<'weekly'>;
    sitemapPriority: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0.7>;
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required;
    specifications: Schema.Attribute.JSON;
    status: Schema.Attribute.Enumeration<['draft', 'published', 'archived']> &
      Schema.Attribute.DefaultTo<'draft'>;
    structuredData: Schema.Attribute.JSON;
    tagline: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    tags: Schema.Attribute.Relation<'manyToMany', 'plugin::zhao-tag.tag'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    viewCount: Schema.Attribute.BigInteger & Schema.Attribute.DefaultTo<0>;
  };
}

export interface PluginZhaoWebsiteSearchLog
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_search_logs';
  info: {
    displayName: '\u641C\u7D22\u65E5\u5FD7';
    pluralName: 'search-logs';
    singularName: 'search-log';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    ipAddress: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    keyword: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.search-log'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    resultCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    visitorId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
  };
}

export interface PluginZhaoWebsiteSeoConfig
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_seo_configs';
  info: {
    displayName: 'SEO \u5168\u5C40\u914D\u7F6E';
    pluralName: 'seo-configs';
    singularName: 'seo-config';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    aiCrawlerPolicy: Schema.Attribute.Enumeration<
      ['allow_all', 'block_all', 'selective']
    > &
      Schema.Attribute.DefaultTo<'allow_all'>;
    alternateLocales: Schema.Attribute.JSON;
    baiduAnalyticsId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    baiduSiteVerification: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    bingSiteVerification: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    customBodyCode: Schema.Attribute.Text;
    customHeadCode: Schema.Attribute.Text;
    defaultDescription: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    defaultKeywords: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    defaultLocale: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }> &
      Schema.Attribute.DefaultTo<'zh-CN'>;
    defaultTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    deletedAt: Schema.Attribute.DateTime;
    enableRobotsTxt: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    enableSitemap: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    extraConfig: Schema.Attribute.JSON;
    favicon: Schema.Attribute.Media;
    geoICBM: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    geoPlacename: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    geoPosition: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    geoRegion: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    googleAnalyticsId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    googleSiteVerification: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    hreflangStrategy: Schema.Attribute.Enumeration<
      ['none', 'subdirectory', 'subdomain', 'tld']
    > &
      Schema.Attribute.DefaultTo<'subdirectory'>;
    icpNumber: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.seo-config'
    > &
      Schema.Attribute.Private;
    ogImage: Schema.Attribute.Media;
    organizationLogo: Schema.Attribute.Media;
    organizationName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    organizationType: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    publicSecurityRecord: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    robotsContent: Schema.Attribute.Text;
    schemaContactPoint: Schema.Attribute.JSON;
    schemaSameAs: Schema.Attribute.JSON;
    site: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    sitemapExcludeTypes: Schema.Attribute.JSON;
    titleTemplate: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoWebsiteTutorial extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_tutorials';
  info: {
    displayName: '\u6559\u7A0B/\u64CD\u4F5C\u6307\u5357';
    pluralName: 'tutorials';
    singularName: 'tutorial';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: true;
    };
  };
  attributes: {
    category: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.article-category'
    >;
    coverImage: Schema.Attribute.Media;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    difficulty: Schema.Attribute.Enumeration<
      ['beginner', 'intermediate', 'advanced']
    > &
      Schema.Attribute.DefaultTo<'beginner'>;
    estimatedTime: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    isFeatured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.tutorial'
    >;
    mainEntity: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-website.knowledge-entity'
    >;
    materials: Schema.Attribute.JSON;
    mentionedEntities: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-website.knowledge-entity'
    >;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    result: Schema.Attribute.Text;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    slug: Schema.Attribute.UID<'title'> & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<['draft', 'published', 'archived']> &
      Schema.Attribute.DefaultTo<'draft'>;
    steps: Schema.Attribute.JSON & Schema.Attribute.Required;
    structuredData: Schema.Attribute.JSON;
    tags: Schema.Attribute.Relation<'manyToMany', 'plugin::zhao-tag.tag'>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    viewCount: Schema.Attribute.BigInteger & Schema.Attribute.DefaultTo<0>;
  };
}

export interface PluginZhaoWebsiteVisitLog extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_website_visit_logs';
  info: {
    displayName: '\u8BBF\u95EE\u65E5\u5FD7';
    pluralName: 'visit-logs';
    singularName: 'visit-log';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    browser: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    city: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    country: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    deviceType: Schema.Attribute.Enumeration<['desktop', 'mobile', 'tablet']> &
      Schema.Attribute.DefaultTo<'desktop'>;
    dwellTime: Schema.Attribute.Integer;
    ipAddress: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-website.visit-log'
    > &
      Schema.Attribute.Private;
    os: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    pageTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    pageUrl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    referrer: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    referrerDomain: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    region: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    scrollDepth: Schema.Attribute.Integer;
    searchKeyword: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    site: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-common.site-config'
    > &
      Schema.Attribute.Required;
    targetId: Schema.Attribute.String;
    targetType: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 30;
      }>;
    type: Schema.Attribute.Enumeration<
      [
        'page_view',
        'article_view',
        'product_view',
        'case_view',
        'download_click',
        'cta_click',
        'search',
        'external_click',
      ]
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userAgent: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    userId: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    utmCampaign: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    utmMedium: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmSource: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    visitorId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
      'plugin::zhao-auth.permission': PluginZhaoAuthPermission;
      'plugin::zhao-auth.role-action-log': PluginZhaoAuthRoleActionLog;
      'plugin::zhao-auth.role-channel': PluginZhaoAuthRoleChannel;
      'plugin::zhao-channel.channel': PluginZhaoChannelChannel;
      'plugin::zhao-channel.channel-member': PluginZhaoChannelChannelMember;
      'plugin::zhao-channel.user-channel': PluginZhaoChannelUserChannel;
      'plugin::zhao-channel.user-invite': PluginZhaoChannelUserInvite;
      'plugin::zhao-common.site-config': PluginZhaoCommonSiteConfig;
      'plugin::zhao-common.site-template': PluginZhaoCommonSiteTemplate;
      'plugin::zhao-course.course': PluginZhaoCourseCourse;
      'plugin::zhao-course.course-category': PluginZhaoCourseCourseCategory;
      'plugin::zhao-course.course-lesson': PluginZhaoCourseCourseLesson;
      'plugin::zhao-course.course-progress': PluginZhaoCourseCourseProgress;
      'plugin::zhao-course.lesson-progress': PluginZhaoCourseLessonProgress;
      'plugin::zhao-course.user-course-auth': PluginZhaoCourseUserCourseAuth;
      'plugin::zhao-logistics.contact-matrix': PluginZhaoLogisticsContactMatrix;
      'plugin::zhao-logistics.conversion-event': PluginZhaoLogisticsConversionEvent;
      'plugin::zhao-logistics.conversion-funnel': PluginZhaoLogisticsConversionFunnel;
      'plugin::zhao-logistics.customer-profile': PluginZhaoLogisticsCustomerProfile;
      'plugin::zhao-logistics.intent-order': PluginZhaoLogisticsIntentOrder;
      'plugin::zhao-logistics.landing-page': PluginZhaoLogisticsLandingPage;
      'plugin::zhao-logistics.quote-field-rule': PluginZhaoLogisticsQuoteFieldRule;
      'plugin::zhao-logistics.quote-price-formula': PluginZhaoLogisticsQuotePriceFormula;
      'plugin::zhao-logistics.quote-price-rule': PluginZhaoLogisticsQuotePriceRule;
      'plugin::zhao-logistics.quote-request': PluginZhaoLogisticsQuoteRequest;
      'plugin::zhao-logistics.referral': PluginZhaoLogisticsReferral;
      'plugin::zhao-logistics.review': PluginZhaoLogisticsReview;
      'plugin::zhao-logistics.subscription': PluginZhaoLogisticsSubscription;
      'plugin::zhao-logistics.tracking-node': PluginZhaoLogisticsTrackingNode;
      'plugin::zhao-logistics.tracking-provider': PluginZhaoLogisticsTrackingProvider;
      'plugin::zhao-logistics.tracking-shipment': PluginZhaoLogisticsTrackingShipment;
      'plugin::zhao-oss.media-meta': PluginZhaoOssMediaMeta;
      'plugin::zhao-oss.sync-record': PluginZhaoOssSyncRecord;
      'plugin::zhao-point.channel-verification': PluginZhaoPointChannelVerification;
      'plugin::zhao-point.pickup-location': PluginZhaoPointPickupLocation;
      'plugin::zhao-point.point-config': PluginZhaoPointPointConfig;
      'plugin::zhao-point.point-product': PluginZhaoPointPointProduct;
      'plugin::zhao-point.point-record': PluginZhaoPointPointRecord;
      'plugin::zhao-point.point-redemption': PluginZhaoPointPointRedemption;
      'plugin::zhao-point.point-rule': PluginZhaoPointPointRule;
      'plugin::zhao-point.point-type': PluginZhaoPointPointType;
      'plugin::zhao-point.rule-template': PluginZhaoPointRuleTemplate;
      'plugin::zhao-point.sign-in-record': PluginZhaoPointSignInRecord;
      'plugin::zhao-quiz.quiz': PluginZhaoQuizQuiz;
      'plugin::zhao-quiz.quiz-batch': PluginZhaoQuizQuizBatch;
      'plugin::zhao-quiz.quiz-exam': PluginZhaoQuizQuizExam;
      'plugin::zhao-quiz.quiz-exam-attempt': PluginZhaoQuizQuizExamAttempt;
      'plugin::zhao-quiz.quiz-record': PluginZhaoQuizQuizRecord;
      'plugin::zhao-sso.sso-app': PluginZhaoSsoSsoApp;
      'plugin::zhao-sso.sso-auth-code': PluginZhaoSsoSsoAuthCode;
      'plugin::zhao-sso.sso-channel': PluginZhaoSsoSsoChannel;
      'plugin::zhao-sso.sso-invite-code': PluginZhaoSsoSsoInviteCode;
      'plugin::zhao-sso.sso-invite-stats': PluginZhaoSsoSsoInviteStats;
      'plugin::zhao-sso.sso-invite-usage': PluginZhaoSsoSsoInviteUsage;
      'plugin::zhao-sso.sso-login-log': PluginZhaoSsoSsoLoginLog;
      'plugin::zhao-sso.sso-oauth-config': PluginZhaoSsoSsoOauthConfig;
      'plugin::zhao-sso.sso-referral-relation': PluginZhaoSsoSsoReferralRelation;
      'plugin::zhao-sso.sso-sms-code': PluginZhaoSsoSsoSmsCode;
      'plugin::zhao-sso.sso-third-party-binding': PluginZhaoSsoSsoThirdPartyBinding;
      'plugin::zhao-sso.sso-token': PluginZhaoSsoSsoToken;
      'plugin::zhao-sso.sso-user': PluginZhaoSsoSsoUser;
      'plugin::zhao-sso.sso-user-app-role': PluginZhaoSsoSsoUserAppRole;
      'plugin::zhao-studio.ad-slot': PluginZhaoStudioAdSlot;
      'plugin::zhao-studio.article-draft': PluginZhaoStudioArticleDraft;
      'plugin::zhao-studio.browser-log': PluginZhaoStudioBrowserLog;
      'plugin::zhao-studio.collect-source': PluginZhaoStudioCollectSource;
      'plugin::zhao-studio.collect-task': PluginZhaoStudioCollectTask;
      'plugin::zhao-studio.knowledge-point-index': PluginZhaoStudioKnowledgePointIndex;
      'plugin::zhao-studio.publish-account': PluginZhaoStudioPublishAccount;
      'plugin::zhao-studio.publish-platform': PluginZhaoStudioPublishPlatform;
      'plugin::zhao-studio.publish-record': PluginZhaoStudioPublishRecord;
      'plugin::zhao-studio.stat-summary': PluginZhaoStudioStatSummary;
      'plugin::zhao-studio.sync-event': PluginZhaoStudioSyncEvent;
      'plugin::zhao-tag.knowledge-point': PluginZhaoTagKnowledgePoint;
      'plugin::zhao-tag.tag': PluginZhaoTagTag;
      'plugin::zhao-tag.tag-group': PluginZhaoTagTagGroup;
      'plugin::zhao-tag.tag-index': PluginZhaoTagTagIndex;
      'plugin::zhao-third.third-party-account': PluginZhaoThirdThirdPartyAccount;
      'plugin::zhao-third.third-party-config': PluginZhaoThirdThirdPartyConfig;
      'plugin::zhao-wealth.wealth-annual-snapshot': PluginZhaoWealthWealthAnnualSnapshot;
      'plugin::zhao-wealth.wealth-collect-config': PluginZhaoWealthWealthCollectConfig;
      'plugin::zhao-wealth.wealth-company': PluginZhaoWealthWealthCompany;
      'plugin::zhao-wealth.wealth-customer-product': PluginZhaoWealthWealthCustomerProduct;
      'plugin::zhao-wealth.wealth-money-income': PluginZhaoWealthWealthMoneyIncome;
      'plugin::zhao-wealth.wealth-nav': PluginZhaoWealthWealthNav;
      'plugin::zhao-wealth.wealth-product': PluginZhaoWealthWealthProduct;
      'plugin::zhao-wealth.wealth-recommend-config': PluginZhaoWealthWealthRecommendConfig;
      'plugin::zhao-wealth.wealth-risk-metric': PluginZhaoWealthWealthRiskMetric;
      'plugin::zhao-wealth.wealth-yearly-return': PluginZhaoWealthWealthYearlyReturn;
      'plugin::zhao-website.ai-content-summary': PluginZhaoWebsiteAiContentSummary;
      'plugin::zhao-website.article': PluginZhaoWebsiteArticle;
      'plugin::zhao-website.article-category': PluginZhaoWebsiteArticleCategory;
      'plugin::zhao-website.brand-info': PluginZhaoWebsiteBrandInfo;
      'plugin::zhao-website.brand-voice': PluginZhaoWebsiteBrandVoice;
      'plugin::zhao-website.case': PluginZhaoWebsiteCase;
      'plugin::zhao-website.compliance': PluginZhaoWebsiteCompliance;
      'plugin::zhao-website.download': PluginZhaoWebsiteDownload;
      'plugin::zhao-website.faq': PluginZhaoWebsiteFaq;
      'plugin::zhao-website.first-truth-policy': PluginZhaoWebsiteFirstTruthPolicy;
      'plugin::zhao-website.interaction': PluginZhaoWebsiteInteraction;
      'plugin::zhao-website.knowledge-entity': PluginZhaoWebsiteKnowledgeEntity;
      'plugin::zhao-website.knowledge-relation': PluginZhaoWebsiteKnowledgeRelation;
      'plugin::zhao-website.lead': PluginZhaoWebsiteLead;
      'plugin::zhao-website.product': PluginZhaoWebsiteProduct;
      'plugin::zhao-website.search-log': PluginZhaoWebsiteSearchLog;
      'plugin::zhao-website.seo-config': PluginZhaoWebsiteSeoConfig;
      'plugin::zhao-website.tutorial': PluginZhaoWebsiteTutorial;
      'plugin::zhao-website.visit-log': PluginZhaoWebsiteVisitLog;
    }
  }
}
