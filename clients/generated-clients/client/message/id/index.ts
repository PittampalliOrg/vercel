/* tslint:disable */
/* eslint-disable */
// Generated by Microsoft Kiota
// @ts-ignore
import { IdItemRequestBuilderRequestsMetadata, type IdItemRequestBuilder } from './item/index.js';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /Message/id
 */
export interface IdRequestBuilder extends BaseRequestBuilder<IdRequestBuilder> {
    /**
     * Gets an item from the Kiota.Message.id.item collection
     * @param id Unique identifier of the item
     * @returns {IdItemRequestBuilder}
     */
     byId(id: string) : IdItemRequestBuilder;
}
/**
 * Uri template for the request builder.
 */
export const IdRequestBuilderUriTemplate = "{+baseurl}/Message/id";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const IdRequestBuilderNavigationMetadata: Record<Exclude<keyof IdRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    byId: {
        requestsMetadata: IdItemRequestBuilderRequestsMetadata,
        pathParametersMappings: ["id"],
    },
};
/* tslint:enable */
/* eslint-enable */
