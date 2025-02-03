/* tslint:disable */
/* eslint-disable */
// Generated by Microsoft Kiota
// @ts-ignore
import { CreatedAtRequestBuilderNavigationMetadata, type CreatedAtRequestBuilder } from './createdAt/index.js';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /Document/id/{id}
 */
export interface IdItemRequestBuilder extends BaseRequestBuilder<IdItemRequestBuilder> {
    /**
     * The createdAt property
     */
    get createdAt(): CreatedAtRequestBuilder;
}
/**
 * Uri template for the request builder.
 */
export const IdItemRequestBuilderUriTemplate = "{+baseurl}/Document/id/{id}";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const IdItemRequestBuilderNavigationMetadata: Record<Exclude<keyof IdItemRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    createdAt: {
        navigationMetadata: CreatedAtRequestBuilderNavigationMetadata,
    },
};
/* tslint:enable */
/* eslint-enable */
