/*
 * Copyright (C) 2018 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { Position, Range } from 'vscode-languageserver-types';
import * as lsp from 'vscode-languageserver-types';
import URI from "@theia/core/lib/common/uri";
import { Event, Disposable } from '@theia/core/lib/common';
import { Saveable } from '@theia/core/lib/browser';
import { DecorationOptions } from './editor-decorations-service';
import { UriSelection } from '@theia/core/lib/common/selection-service';

export {
    Position, Range
};

export const TextEditorProvider = Symbol('TextEditorProvider');
export type TextEditorProvider = (uri: URI) => Promise<TextEditor>;

export interface TextEditorDocument extends lsp.TextDocument, Saveable, Disposable {
}

export interface TextEditor extends Disposable, TextEditorSelection {
    readonly node: HTMLElement;

    readonly uri: URI;
    readonly document: TextEditorDocument;
    readonly onDocumentContentChanged: Event<TextEditorDocument>;

    cursor: Position;
    readonly onCursorPositionChanged: Event<Position>;

    selection: Range;
    readonly onSelectionChanged: Event<Range>;

    focus(): void;
    blur(): void;
    isFocused(): boolean;
    readonly onFocusChanged: Event<boolean>;

    revealPosition(position: Position, options?: RevealPositionOptions): void;
    revealRange(range: Range, options?: RevealRangeOptions): void;

    /**
     * Re-renders the editor.
     */
    refresh(): void;
    /**
     * Resize the editor to fit its node.
     */
    resizeToFit(): void;
    setSize(size: Dimension): void;

    /**
     * Applies decorations for given type and options.
     * Previous decoration of the same type are not preserved.
     * To remove decorations of a type, pass an empty options array.
     */
    setDecorations(params: SetDecorationParams): void;
}

export interface Dimension {
    width: number;
    height: number;
}

export interface TextEditorSelection extends UriSelection {
    cursor?: Position
    selection?: Range
}
export namespace TextEditorSelection {
    // tslint:disable-next-line:no-any
    export function is(arg: any): arg is TextEditorSelection {
        return UriSelection.is(arg);
    }
}

export namespace TextEditorSelection {
    export const ID = 'text-editor-selection';
}

export interface RevealPositionOptions {
    vertical: 'auto' | 'center' | 'centerIfOutsideViewport';
    horizontal?: boolean;
}

export interface RevealRangeOptions {
    at: 'auto' | 'center' | 'top' | 'centerIfOutsideViewport';
}

export interface SetDecorationParams {
    uri: string;
    type: string;
    options: DecorationOptions[];
}
