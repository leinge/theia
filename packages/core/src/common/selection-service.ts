/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Emitter, Event } from '../common/event';
import { injectable } from 'inversify';
import URI from './uri';

// tslint:disable:no-any

export interface SelectionContext {
    [key: string]: any;
}

export interface Selection {
    readonly context?: object;
    [key: string]: any;
}

export interface UriSelection {
    readonly uri: URI;
}
export namespace UriSelection {
    export function is(arg: any): arg is UriSelection {
        return arg && arg['uri'] instanceof URI;
    }
    export function getUri(selection: any): URI | undefined {
        if (UriSelection.is(selection)) {
            return selection.uri;
        }
        return undefined;
    }
}

export interface StructuredSelection extends Selection {
    readonly elements: Selection[];
}
export namespace StructuredSelection {
    export function is(arg: any): arg is StructuredSelection {
        // TODO Redundant check?
        return arg && Array.isArray(arg['elements']);
    }
}

export interface SelectionProvider<T> {
    onSelectionChanged: Event<T | undefined>;
}

@injectable()
export class SelectionService implements SelectionProvider<Selection | undefined> {

    private currentSelection: Selection | undefined;
    private selectionListeners: Emitter<Selection | undefined> = new Emitter();

    get selection(): Selection | undefined {
        return this.currentSelection;
    }

    set selection(selection: Selection | undefined) {
        this.currentSelection = selection;
        this.selectionListeners.fire(this.currentSelection);
    }

    get onSelectionChanged(): Event<Selection | undefined> {
        return this.selectionListeners.event;
    }
}

/**
 * Context for the selection.
 */
export namespace SelectionContext {

    export const CONTEXT = Symbol('theia-selection-context');
    export const SOURCE = Symbol('theia-selection-source');

    /**
     * Returns with the selection context for the object.
     * `undefined` if the context is non available.
     */
    export function getSelectionContext(selection: Selection): SelectionContext | undefined {
        return selection[SelectionContext.CONTEXT];
    }

    /**
     * Returns with the selection source, if any.
     */
    export function getSelectionSource(selection: Selection | undefined): any | undefined {
        if (selection === undefined) {
            return undefined;
        }
        const context = getSelectionContext(selection);
        if (context === undefined) {
            return undefined;
        }
        return context[SelectionContext.SOURCE];
    }

    /**
     * Sets the selection source on the selection argument. If the source was already set,
     * calling this function will override the previous state. Returns with the
     * `selection` argument.
     */
    export function setSelectionSource<S extends Selection>(selection: S, source: any): S {
        let context = getSelectionContext(selection);
        if (context === undefined) {
            context = {};
            selection[SelectionContext.CONTEXT] = context;
        }
        context[SelectionContext.SOURCE] = source;
        return selection;
    }

}
