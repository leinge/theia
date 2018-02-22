/*
 * Copyright (C) 2018 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { interfaces } from "inversify";
import {
    createPreferenceProxy,
    PreferenceProxy,
    PreferenceService,
    PreferenceContribution,
    PreferenceSchema
} from '@theia/core/lib/browser/preferences';

export const NotificationConfigSchema: PreferenceSchema = {
    "type": "object",
    "properties": {
        "notification.autoDismissError": {
            "type": "number",
            "description": "The time before auto-removing the error notification.",
            "default": 0 // time express in millisec. 0 means : Do not remove
        },
        "notification.autoDismissWarning": {
            "type": "number",
            "description": "The time before auto-removing the warning notification.",
            "default": 10000 // time express in millisec. 0 means : Do not remove
        },
        "notification.autoDismissInfo": {
            "type": "number",
            "description": "The time before auto-removing the info notification.",
            "default": 5000 // time express in millisec. 0 means : Do not remove
        }
    }
};

export interface NotificationConfiguration {
    'notification.autoDismissError': number
    'notification.autoDismissWarning': number
    'notification.autoDismissInfo': number
}

export const NotificationPreferences = Symbol('NotificationPreferences');
export type NotificationPreferences = PreferenceProxy<NotificationConfiguration>;

export function createNotificationPreferences(preferences: PreferenceService): NotificationPreferences {
    return createPreferenceProxy(preferences, NotificationConfigSchema);
}

export function bindNotificationPreferences(bind: interfaces.Bind): void {
    bind(NotificationPreferences).toDynamicValue(ctx => {
        const preferences = ctx.container.get<PreferenceService>(PreferenceService);
        return createNotificationPreferences(preferences);
    });

    bind(PreferenceContribution).toConstantValue({ schema: NotificationConfigSchema });
}
