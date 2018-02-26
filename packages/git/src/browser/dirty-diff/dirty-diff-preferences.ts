/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { interfaces } from 'inversify';
import {
    createPreferenceProxy,
    PreferenceProxy,
    PreferenceService,
    PreferenceContribution,
    PreferenceSchema
} from '@theia/core/lib/browser';

export const enum DIRTYDIFF {
    ENABLED = 'editor.dirtydiff.enabled',
}

export const DirtyDiffConfigSchema: PreferenceSchema = {
    'type': 'object',
    'properties': {
        [DIRTYDIFF.ENABLED]: {
            'type': 'boolean',
            'description': 'Show dirty diff in editor.',
            'default': true
        }
    }
};

export interface DirtyDiffConfiguration {
    'editor.dirtydiff.enabled': boolean
}

export const DirtyDiffPreferences = Symbol('DirtyDiffPreferences');
export type DirtyDiffPreferences = PreferenceProxy<DirtyDiffConfiguration>;

export function createDirtyDiffPreferences(preferences: PreferenceService): DirtyDiffPreferences {
    return createPreferenceProxy(preferences, DirtyDiffConfigSchema);
}

export function bindDirtyDiffPreferences(bind: interfaces.Bind): void {
    bind(DirtyDiffPreferences).toDynamicValue(ctx => {
        const preferences = ctx.container.get<PreferenceService>(PreferenceService);
        return createDirtyDiffPreferences(preferences);
    });

    bind(PreferenceContribution).toConstantValue({ schema: DirtyDiffConfigSchema });
}
