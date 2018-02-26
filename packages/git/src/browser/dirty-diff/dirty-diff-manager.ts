/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, injectable, postConstruct } from 'inversify';
import { EditorManager } from '@theia/editor/lib/browser';
import { Workspace, TextDocument } from '@theia/languages/lib/common';
import URI from '@theia/core/lib/common/uri';
import { DirtyDiffComputer, DirtyDiff } from './diff-computer';
import { Emitter, Event } from '@theia/core';
import { DirtyDiffPreferences, DIRTYDIFF, DirtyDiffConfiguration } from './dirty-diff-preferences';
import { PreferenceChangeEvent } from '@theia/core/lib/browser';
import { GitResourceResolver, GIT_RESOURCE_SCHEME } from '../git-resource';
import { WorkingDirectoryStatus, GitFileStatus } from '../../common';
import { GitRepositoryTracker } from '../git-repository-tracker';

@injectable()
export class DirtyDiffManager {

    protected readonly models = new Map<string, DirtyDiffModel>();
    protected readonly dirtyDiffComputer = new DirtyDiffComputer();

    protected currentGitStatus: WorkingDirectoryStatus | undefined;

    protected readonly onDityDiffUpdateEmitter = new Emitter<DityDiffUpdate>();
    readonly onDityDiffUpdate: Event<DityDiffUpdate> = this.onDityDiffUpdateEmitter.event;

    @inject(GitRepositoryTracker) protected readonly repositoryTracker: GitRepositoryTracker;
    @inject(GitResourceResolver) protected readonly gitResourceResolver: GitResourceResolver;
    @inject(EditorManager) protected readonly editorManager: EditorManager;
    @inject(Workspace) protected readonly workspace: Workspace;
    @inject(DirtyDiffPreferences) protected readonly preferences: DirtyDiffPreferences;

    @postConstruct()
    protected async initialize() {
        this.currentGitStatus = this.repositoryTracker.selectedRepositoryStatus;
        if (this.currentGitStatus) {
            await this.updateNewFiles(this.currentGitStatus);
        }
        this.workspace.onDidCloseTextDocument(document => this.removeModel(document.uri));
        this.workspace.onDidOpenTextDocument(async document => await this.handleDocumentUpdate(document.uri));
        this.workspace.onDidChangeTextDocument(async params => await this.handleDocumentUpdate(params.textDocument.uri));
        this.preferences.onPreferenceChanged(e => this.handlePreferenceChange(e));
        this.repositoryTracker.onGitEvent(event => this.handleGitStatusUpdate(event.status));
    }

    protected async handleGitStatusUpdate(status: WorkingDirectoryStatus) {
        this.currentGitStatus = status;
        await this.updateManagedFiles(status);
        await this.updateNewFiles(status);
    }

    protected async updateManagedFiles(status: WorkingDirectoryStatus) {
        const uris = Array.from(this.models.keys());
        const managed = status.changes.filter(c => c.status === GitFileStatus.Modified && uris.indexOf(c.uri) !== -1);
        for (const change of managed) {
            const uri = change.uri;
            const staged = change.staged || false;
            const model = this.models.get(uri);
            if (model && model.staged !== staged) {
                model.staged = staged;
                try {
                    await this.updatePreviousContent(model);
                    this.updateDirtyDiffForUri(uri);
                } catch (error) {
                    this.models.delete(uri);
                }
            }
        }
    }

    protected async updateNewFiles(status: WorkingDirectoryStatus) {
        const newFiles = status.changes.filter(change => change.status === GitFileStatus.New);
        const staged = new Set(newFiles.filter(f => f.staged).map(f => f.uri));
        const unstaged = new Set(newFiles.filter(f => !f.staged).map(f => f.uri));
        const stagedAndUnstaged = new Set([...staged].filter(u => unstaged.has(u)));
        const unstagedOnly = [...unstaged].filter(u => !stagedAndUnstaged.has(u));
        for (const uri of unstagedOnly) {
            const model = this.models.get(uri);
            if (model) {
                this.models.delete(uri);
                this.clearDirtyDiffs(uri);
            }
        }
        for (const uri of staged) {
            const model = await this.getOrCreateModel(uri);
            if (model && stagedAndUnstaged.has(uri)) {
                model.staged = true;
                this.updateDirtyDiffForUri(uri);
            }
        }
    }

    protected removeModel(uri: string) {
        this.models.delete(uri);
    }

    protected async getOrCreateModel(documentUri: string): Promise<DirtyDiffModel | undefined> {
        let model = this.models.get(documentUri);
        if (model) {
            return model;
        }
        if (this.isIndexed(documentUri)) {
            model = await this.createModel(new URI(documentUri), true);
            if (model) {
                this.models.set(documentUri, model);
            }
        }
        return model;
    }

    protected isIndexed(documentUri: string): boolean {
        const status = this.currentGitStatus;
        if (status) {
            return status.changes.some(c => (c.status !== GitFileStatus.New || (c.status === GitFileStatus.New && !!c.staged)) && c.uri === documentUri);
        }
        return false;
    }

    protected async handleDocumentUpdate(uri: string) {
        const model = await this.getOrCreateModel(uri);
        if (model) {
            this.updateDirtyDiffForUri(uri);
        }
    }

    protected updateDirtyDiffForUri(uri: string) {
        const document = this.workspace.textDocuments.find(d => d.uri === uri);
        if (document) {
            this.updateDirtyDiffForDocument(document);
        }
    }

    protected updateDirtyDiffForDocument(textDocument: TextDocument) {
        if (!this.isEnabled()) {
            return;
        }
        const uri = textDocument.uri;
        if (!this.isEditorVisible(uri)) {
            return;
        }
        const model = this.models.get(uri);
        if (model) {
            this.update(model, textDocument);
            const dirtyDiffUpdate = <DityDiffUpdate>{ uri, ...model.dirtyDiff };
            this.onDityDiffUpdateEmitter.fire(dirtyDiffUpdate);
        }
    }

    protected isEnabled(): boolean {
        return this.preferences[DIRTYDIFF.ENABLED];
    }

    protected handlePreferenceChange(event: PreferenceChangeEvent<DirtyDiffConfiguration>) {
        const uris = Array.from(this.models.keys());
        const { preferenceName, newValue } = event;
        if (preferenceName === DIRTYDIFF.ENABLED) {
            const enabled = !!newValue;
            for (const uri of uris) {
                this.changeEnablementNow(uri, enabled);
            }
        }
    }

    protected changeEnablementNow(uri: string, enabled: boolean) {
        if (enabled) {
            this.updateDirtyDiffForUri(uri);
        } else {
            this.clearDirtyDiffs(uri);
        }
    }

    protected clearDirtyDiffs(uri: string) {
        this.onDityDiffUpdateEmitter.fire(<DityDiffUpdate>{ uri, added: [], removed: [], modified: [] });
    }

    protected async isEditorVisible(uri: string): Promise<boolean> {
        const editor = await this.editorManager.getByUri(new URI(uri));
        return !!editor && editor.isVisible;
    }

    protected async createModel(uri: URI, staged: boolean): Promise<DirtyDiffModel | undefined> {
        const model = <DirtyDiffModel>{ uri, staged, previous: <string[]>[] };
        try {
            await this.updatePreviousContent(model);
        } catch (error) {
            return undefined;
        }
        return model;
    }

    protected async updatePreviousContent(model: DirtyDiffModel): Promise<void> {
        const uri = model.uri;
        const query = model.staged ? "" : "HEAD";
        const gitResource = await this.gitResourceResolver.getResource(uri.withScheme(GIT_RESOURCE_SCHEME).withQuery(query));
        const previousContents = await gitResource.readContents();
        const previous = this.splitLines(previousContents);
        model.previous = previous;
    }

    protected update(model: DirtyDiffModel, document: TextDocument) {
        const previous = model.previous;
        const currentContents = document.getText();
        const current = this.splitLines(currentContents);
        model.dirtyDiff = this.dirtyDiffComputer.computeDirtyDiff(previous, current);
    }

    protected splitLines(text: string): string[] {
        return text.split(/\r\n|\n/);
    }

}

export interface DirtyDiffModel {
    readonly uri: URI;
    staged: boolean;
    previous: string[];
    dirtyDiff: DirtyDiff;
}

export interface DityDiffUpdate extends DirtyDiff {
    readonly uri: string;
}
