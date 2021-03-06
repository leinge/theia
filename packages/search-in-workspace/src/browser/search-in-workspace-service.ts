/*
 * Copyright (C) 2017-2018 Erisson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { SearchInWorkspaceServer, SearchInWorkspaceClient, SearchInWorkspaceResult, SearchInWorkspaceOptions } from "../common/search-in-workspace-interface";
import { WorkspaceService } from "@theia/workspace/lib/browser";
import URI from "@theia/core/lib/common/uri";
import { ILogger } from "@theia/core";

/**
 * Class that will receive the search results from the server.  This is separate
 * from the SearchInWorkspaceService class only to avoid a cycle in the
 * dependency injection.
 */

@injectable()
export class SearchInWorkspaceClientImpl implements SearchInWorkspaceClient {
    private service: SearchInWorkspaceClient;

    onResult(searchId: number, result: SearchInWorkspaceResult): void {
        this.service.onResult(searchId, result);
    }
    onDone(searchId: number, error?: string): void {
        this.service.onDone(searchId, error);
    }

    setService(service: SearchInWorkspaceClient) {
        this.service = service;
    }
}

export type SearchInWorkspaceCallbacks = SearchInWorkspaceClient;

/**
 * Service to search text in the workspace files.
 */

@injectable()
export class SearchInWorkspaceService implements SearchInWorkspaceClient {

    // All the searches that we have started, that are not done yet (onDone
    // with that searchId has not been called).
    private pendingSearches = new Map<number, SearchInWorkspaceCallbacks>();

    // Due to the asynchronicity of the node backend, it's possible that we
    // start a search, receive an event for that search, and then receive
    // the search id for that search.We therefore need to keep those
    // events until we get the search id and return it to the caller.
    // Otherwise the caller would discard the event because it doesn't know
    // the search id yet.
    private pendingOnDones: Map<number, string | undefined> = new Map();

    private lastKnownSearchId: number = -1;

    constructor(
        @inject(SearchInWorkspaceServer) protected readonly searchServer: SearchInWorkspaceServer,
        @inject(SearchInWorkspaceClientImpl) protected readonly client: SearchInWorkspaceClientImpl,
        @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService,
        @inject(ILogger) protected readonly logger: ILogger,
    ) {
        client.setService(this);
    }

    isEnabled(): boolean {
        return this.workspaceService.opened;
    }

    onResult(searchId: number, result: SearchInWorkspaceResult): void {
        const callbacks = this.pendingSearches.get(searchId);

        if (callbacks) {
            callbacks.onResult(searchId, result);
        }
    }

    onDone(searchId: number, error?: string): void {
        const callbacks = this.pendingSearches.get(searchId);

        if (callbacks) {
            this.pendingSearches.delete(searchId);
            callbacks.onDone(searchId, error);
        } else {
            if (searchId > this.lastKnownSearchId) {
                this.logger.debug(`Got an onDone for a searchId we don't know about (${searchId}), stashing it for later with error = `, error);
                this.pendingOnDones.set(searchId, error);
            } else {
                // It's possible to receive an onDone for a search we have cancelled.  Just ignore it.
                this.logger.debug(`Got an onDone for a searchId we don't know about (${searchId}), but it's probably an old one, error = `, error);
            }
        }
    }

    // Start a search of the string "what" in the workspace.
    async search(what: string, callbacks: SearchInWorkspaceCallbacks, opts?: SearchInWorkspaceOptions): Promise<number> {
        const root = await this.workspaceService.root;

        if (!root) {
            throw new Error("Search failed: no workspace root.");
        }

        const rootUri = new URI(root.uri);
        const searchId = await this.searchServer.search(what, rootUri.path.toString(), opts);
        this.pendingSearches.set(searchId, callbacks);
        this.lastKnownSearchId = searchId;

        this.logger.debug('Service launched search ' + searchId);

        // Check if we received an onDone before search() returned.
        if (this.pendingOnDones.has(searchId)) {
            this.logger.debug('Ohh, we have a stashed onDone for that searchId');
            const error = this.pendingOnDones.get(searchId);
            this.pendingOnDones.delete(searchId);

            // Call the client's searchId, but first give it a
            // chance to record the returned searchId.
            setTimeout(() => {
                this.onDone(searchId, error);
            }, 0);
        }

        return searchId;
    }

    // Cancel an ongoing search.
    cancel(searchId: number) {
        this.pendingSearches.delete(searchId);
        this.searchServer.cancel(searchId);
    }
}
