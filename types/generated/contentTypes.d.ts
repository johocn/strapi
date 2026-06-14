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
    description: '\u89D2\u8272-\u6E20\u9053\u5173\u8054';
    displayName: 'Role Channel';
    pluralName: 'role-channels';
    singularName: 'role-channel';
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
    grantedBy: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
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

export interface PluginZhaoCommonFeatureFlag
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_feature_flags';
  info: {
    displayName: '\u529F\u80FD\u5F00\u5173';
    pluralName: 'feature-flags';
    singularName: 'feature-flag';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    flagKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    flagValue: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-common.feature-flag'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    targetChannels: Schema.Attribute.JSON;
    targetRoles: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoCommonSiteConfig
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_site_configs';
  info: {
    description: '\u7AD9\u70B9\u901A\u7528\u914D\u7F6E\uFF08\u5355\u4F8B\uFF09';
    displayName: '\u7AD9\u70B9\u914D\u7F6E';
    pluralName: 'site-configs';
    singularName: 'site-config';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    customerServiceUrl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    extraConfig: Schema.Attribute.JSON;
    favicon: Schema.Attribute.Media<'images'>;
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
    tencentMapKey: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
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
    knowledgePoints: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-tag.knowledge-point'
    >;
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
    knowledgePoints: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-tag.knowledge-point'
    >;
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

export interface PluginZhaoTagCategoryPreset
  extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_category_presets';
  info: {
    displayName: '\u5206\u7C7B\u9884\u8BBE';
    pluralName: 'category-presets';
    singularName: 'category-preset';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    categoryName: Schema.Attribute.String & Schema.Attribute.Required;
    categoryType: Schema.Attribute.Enumeration<
      ['course', 'knowledge', 'article', 'video']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'course'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.category-preset'
    > &
      Schema.Attribute.Private;
    presetTags: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    sort: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    tagGroup: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::zhao-tag.tag-group'
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
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.Text;
    group: Schema.Attribute.Relation<'manyToOne', 'plugin::zhao-tag.tag-group'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.knowledge-point'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'>;
    sort: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    usageCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface PluginZhaoTagTag extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_tags';
  info: {
    displayName: '\u901A\u7528\u6807\u7B7E';
    pluralName: 'tags';
    singularName: 'tag';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    courses: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-course.course'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    group: Schema.Attribute.Relation<'manyToOne', 'plugin::zhao-tag.tag-group'>;
    lessons: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::zhao-course.course-lesson'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.tag'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'>;
    sort: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    usageCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
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
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    description: Schema.Attribute.String;
    knowledgePoints: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.knowledge-point'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-tag.tag-group'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'>;
    sort: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    tags: Schema.Attribute.Relation<'oneToMany', 'plugin::zhao-tag.tag'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginZhaoTagTagIndex extends Struct.CollectionTypeSchema {
  collectionName: 'zhao_tag_indices';
  info: {
    displayName: '\u6807\u7B7E\u7D22\u5F15';
    pluralName: 'tag-indices';
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
    description: '\u4E09\u65B9\u5E73\u53F0\u8D26\u53F7\u7ED1\u5B9A';
    displayName: 'Third Party Account';
    pluralName: 'third-party-accounts';
    singularName: 'third-party-account';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    appType: Schema.Attribute.Enumeration<
      ['official_account', 'mini_program', 'open_platform', 'default']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'default'>;
    avatar: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    boundAt: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-third.third-party-account'
    > &
      Schema.Attribute.Private;
    nickname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    openId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 128;
      }>;
    platform: Schema.Attribute.Enumeration<['wechat', 'alipay', 'douyin']> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    rawProfile: Schema.Attribute.JSON;
    unionId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 128;
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

export interface PluginZhaoThirdThirdPartyConfig
  extends Struct.CollectionTypeSchema {
  collectionName: 'third_party_configs';
  info: {
    description: '\u4E09\u65B9\u767B\u5F55\u5E73\u53F0\u914D\u7F6E';
    displayName: 'Third Party Config';
    pluralName: 'third-party-configs';
    singularName: 'third-party-config';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    appId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 64;
      }>;
    appSecret: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 128;
      }>;
    appType: Schema.Attribute.Enumeration<
      ['official_account', 'mini_program', 'open_platform', 'default']
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    extraConfig: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::zhao-third.third-party-config'
    > &
      Schema.Attribute.Private;
    platform: Schema.Attribute.Enumeration<['wechat', 'alipay', 'douyin']> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    requireAuth: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
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
      'plugin::zhao-common.feature-flag': PluginZhaoCommonFeatureFlag;
      'plugin::zhao-common.site-config': PluginZhaoCommonSiteConfig;
      'plugin::zhao-course.course': PluginZhaoCourseCourse;
      'plugin::zhao-course.course-category': PluginZhaoCourseCourseCategory;
      'plugin::zhao-course.course-lesson': PluginZhaoCourseCourseLesson;
      'plugin::zhao-course.course-progress': PluginZhaoCourseCourseProgress;
      'plugin::zhao-course.lesson-progress': PluginZhaoCourseLessonProgress;
      'plugin::zhao-course.user-course-auth': PluginZhaoCourseUserCourseAuth;
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
      'plugin::zhao-sso.sso-referral-relation': PluginZhaoSsoSsoReferralRelation;
      'plugin::zhao-sso.sso-third-party-binding': PluginZhaoSsoSsoThirdPartyBinding;
      'plugin::zhao-sso.sso-token': PluginZhaoSsoSsoToken;
      'plugin::zhao-sso.sso-user': PluginZhaoSsoSsoUser;
      'plugin::zhao-sso.sso-user-app-role': PluginZhaoSsoSsoUserAppRole;
      'plugin::zhao-tag.category-preset': PluginZhaoTagCategoryPreset;
      'plugin::zhao-tag.knowledge-point': PluginZhaoTagKnowledgePoint;
      'plugin::zhao-tag.tag': PluginZhaoTagTag;
      'plugin::zhao-tag.tag-group': PluginZhaoTagTagGroup;
      'plugin::zhao-tag.tag-index': PluginZhaoTagTagIndex;
      'plugin::zhao-third.third-party-account': PluginZhaoThirdThirdPartyAccount;
      'plugin::zhao-third.third-party-config': PluginZhaoThirdThirdPartyConfig;
    }
  }
}
