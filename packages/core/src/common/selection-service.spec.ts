/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { expect } from 'chai';
import { DisposableCollection } from './disposable';
import { SelectionService, SelectionContext } from './selection-service';

// tslint:disable:no-unused-expression

describe('selection-service', () => {

    const disposables = new DisposableCollection();

    afterEach(() => {
        disposables.dispose();
    });

    it('should functions as a noop after disposal', () => {
        const service = new SelectionService();
        // tslint:disable-next-line:no-any
        const events: any[] = [];
        disposables.push(service.onSelectionChanged(e => events.push(e)));
        service.selection = { foo: "foo" };
        disposables.dispose();
        service.selection = { bar: "bar" };
        expect(events.length).equals(1);
        expect(events[0]).to.deep.equals({ foo: "foo" });
    });

    it('selection context - undefined', () => {
        expect(SelectionContext.getSelectionContext({})).to.be.undefined;
    });

    it('selection context - defined', () => {
        const selection = { foo: 'foo' };
        SelectionContext.setSelectionSource(selection, 'foo-source');
        expect(SelectionContext.getSelectionContext(selection)).to.be.not.undefined;
    });

    it('selection context - selection source - undefined', () => {
        const selection = { foo: 'foo' };
        // Do not set selection source.
        expect(SelectionContext.getSelectionSource(selection)).to.be.undefined;
    });

    it('selection context - selection source - defined', () => {
        const selection = { foo: 'foo' };
        SelectionContext.setSelectionSource(selection, 'foo-source');
        expect(SelectionContext.getSelectionSource(selection)).to.be.equal('foo-source');
    });

    it('selection context - selection source - property getter from service', () => {
        const selection = { foo: 'foo' };
        SelectionContext.setSelectionSource(selection, 'foo-source');
        const service = new SelectionService();
        service.selection = selection;
        expect(SelectionContext.getSelectionSource(service.selection)).to.be.equal('foo-source');
    });

    it('selection context - selection source - on change from service', () => {
        const selection = { foo: 'foo' };
        SelectionContext.setSelectionSource(selection, 'foo-source');
        const service = new SelectionService();
        // tslint:disable-next-line:no-any
        const selections: any[] = [];
        disposables.push(service.onSelectionChanged(s => selections.push(s)));
        service.selection = selection;
        expect(SelectionContext.getSelectionSource(selections[0])).to.be.equal('foo-source');
    });

});
