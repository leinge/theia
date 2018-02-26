/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject, postConstruct } from "inversify";
import { Git, Repository, WorkingDirectoryStatus } from '../common';
import { Event, Emitter, DisposableCollection } from "@theia/core";
import { GitRepositoryProvider } from './git-repository-provider';
import { GitWatcher, GitStatusChangeEvent } from "../common/git-watcher";

@injectable()
export class GitRepositoryTracker {

    protected toDispose = new DisposableCollection();
    protected workingDirectoryStatus: WorkingDirectoryStatus | undefined;
    protected readonly onGitEventEmitter = new Emitter<GitStatusChangeEvent>();

    constructor(
        @inject(Git) protected readonly git: Git,
        @inject(GitRepositoryProvider) protected readonly repositoryProvider: GitRepositoryProvider,
        @inject(GitWatcher) protected readonly gitWatcher: GitWatcher,
    ) { }

    @postConstruct()
    protected async init() {
        this.repositoryProvider.onDidChangeRepository(async repository => {
            this.toDispose.dispose();
            if (repository) {
                this.toDispose.push(await this.gitWatcher.watchGitChanges(repository));
                this.toDispose.push(this.gitWatcher.onGitEvent((event: GitStatusChangeEvent) => {
                    this.workingDirectoryStatus = event.status;
                    this.onGitEventEmitter.fire(event);
                }));
            }
        });
        await this.repositoryProvider.refresh();
        if (this.selectedRepository) {
            this.git.status(this.selectedRepository);
        }
    }

    get selectedRepository(): Repository | undefined {
        return this.repositoryProvider.selectedRepository;
    }

    get allRepositories(): Repository[] {
        return this.repositoryProvider.allRepositories;
    }

    get selectedRepositoryStatus(): WorkingDirectoryStatus | undefined {
        return this.workingDirectoryStatus;
    }

    get onDidChangeRepository(): Event<Repository | undefined> {
        return this.repositoryProvider.onDidChangeRepository;
    }

    get onGitEvent(): Event<GitStatusChangeEvent> {
        return this.onGitEventEmitter.event;
    }

}
