/// <reference types='diff'/>

declare module "mod" {
    module "diff" {
        function diffArrays(a: string[], b: string[]): IDiffArraysResult[];

        interface IArrayDiffResult {
            value: string[];
            count?: number;
            added?: boolean;
            removed?: boolean;
        }
    }
}