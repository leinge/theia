/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { interfaces } from 'inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { DirtyDiffContribution } from './dirty-diff-frontend-contribution';
import { DirtyDiffManager } from './dirty-diff-manager';
import { DirtyDiffDecorator } from './dirty-diff-decorator';
import { bindDirtyDiffPreferences } from './dirty-diff-preferences';

import '../../../src/browser/style/dirty-diff.css';

export function bindDirtyDiff(bind: interfaces.Bind) {
    bindDirtyDiffPreferences(bind);
    bind(DirtyDiffManager).toSelf().inSingletonScope();
    bind(DirtyDiffContribution).toSelf().inSingletonScope();
    bind(DirtyDiffDecorator).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toDynamicValue(ctx => ctx.container.get(DirtyDiffContribution)).inSingletonScope();
}
