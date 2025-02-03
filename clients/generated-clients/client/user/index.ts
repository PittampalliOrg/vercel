/* tslint:disable */
/* eslint-disable */
// Generated by Microsoft Kiota
// @ts-ignore
import { createUserFromDiscriminatorValue, serializeUser, type User } from '../models/index.js';
// @ts-ignore
import { IdRequestBuilderNavigationMetadata, type IdRequestBuilder } from './id/index.js';
// @ts-ignore
import { type AdditionalDataHolder, type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type ParseNode, type RequestConfiguration, type RequestInformation, type RequestsMetadata, type SerializationWriter } from '@microsoft/kiota-abstractions';

/**
 * Creates a new instance of the appropriate class based on discriminator value
 * @param parseNode The parse node to use to read the discriminator value and create the object
 * @returns {UserGetResponse}
 */
// @ts-ignore
export function createUserGetResponseFromDiscriminatorValue(parseNode: ParseNode | undefined) : ((instance?: Parsable) => Record<string, (node: ParseNode) => void>) {
    return deserializeIntoUserGetResponse;
}
/**
 * Creates a new instance of the appropriate class based on discriminator value
 * @param parseNode The parse node to use to read the discriminator value and create the object
 * @returns {UserPostResponse}
 */
// @ts-ignore
export function createUserPostResponseFromDiscriminatorValue(parseNode: ParseNode | undefined) : ((instance?: Parsable) => Record<string, (node: ParseNode) => void>) {
    return deserializeIntoUserPostResponse;
}
/**
 * The deserialization information for the current model
 * @returns {Record<string, (node: ParseNode) => void>}
 */
// @ts-ignore
export function deserializeIntoUserGetResponse(userGetResponse: Partial<UserGetResponse> | undefined = {}) : Record<string, (node: ParseNode) => void> {
    return {
        "nextLink": n => { userGetResponse.nextLink = n.getStringValue(); },
        "value": n => { userGetResponse.value = n.getCollectionOfObjectValues<User>(createUserFromDiscriminatorValue); },
    }
}
/**
 * The deserialization information for the current model
 * @returns {Record<string, (node: ParseNode) => void>}
 */
// @ts-ignore
export function deserializeIntoUserPostResponse(userPostResponse: Partial<UserPostResponse> | undefined = {}) : Record<string, (node: ParseNode) => void> {
    return {
        "value": n => { userPostResponse.value = n.getCollectionOfObjectValues<User>(createUserFromDiscriminatorValue); },
    }
}
/**
 * Serializes information the current object
 * @param writer Serialization writer to use to serialize this model
 */
// @ts-ignore
export function serializeUserGetResponse(writer: SerializationWriter, userGetResponse: Partial<UserGetResponse> | undefined | null = {}) : void {
    if (userGetResponse) {
        writer.writeStringValue("nextLink", userGetResponse.nextLink);
        writer.writeCollectionOfObjectValues<User>("value", userGetResponse.value, serializeUser);
        writer.writeAdditionalData(userGetResponse.additionalData);
    }
}
/**
 * Serializes information the current object
 * @param writer Serialization writer to use to serialize this model
 */
// @ts-ignore
export function serializeUserPostResponse(writer: SerializationWriter, userPostResponse: Partial<UserPostResponse> | undefined | null = {}) : void {
    if (userPostResponse) {
        writer.writeCollectionOfObjectValues<User>("value", userPostResponse.value, serializeUser);
        writer.writeAdditionalData(userPostResponse.additionalData);
    }
}
export interface UserGetResponse extends AdditionalDataHolder, Parsable {
    /**
     * Stores additional data not described in the OpenAPI description found when deserializing. Can be used for serialization as well.
     */
    additionalData?: Record<string, unknown>;
    /**
     * The nextLink property
     */
    nextLink?: string | null;
    /**
     * The value property
     */
    value?: User[] | null;
}
export interface UserPostResponse extends AdditionalDataHolder, Parsable {
    /**
     * Stores additional data not described in the OpenAPI description found when deserializing. Can be used for serialization as well.
     */
    additionalData?: Record<string, unknown>;
    /**
     * The value property
     */
    value?: User[] | null;
}
/**
 * Builds and executes requests for operations under /User
 */
export interface UserRequestBuilder extends BaseRequestBuilder<UserRequestBuilder> {
    /**
     * The id property
     */
    get id(): IdRequestBuilder;
    /**
     * Returns entities.
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<UserGetResponse>}
     */
     get(requestConfiguration?: RequestConfiguration<UserRequestBuilderGetQueryParameters> | undefined) : Promise<UserGetResponse | undefined>;
    /**
     * Create entity.
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<UserPostResponse>}
     */
     post(body: User, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<UserPostResponse | undefined>;
    /**
     * Returns entities.
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toGetRequestInformation(requestConfiguration?: RequestConfiguration<UserRequestBuilderGetQueryParameters> | undefined) : RequestInformation;
    /**
     * Create entity.
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toPostRequestInformation(body: User, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Returns entities.
 */
export interface UserRequestBuilderGetQueryParameters {
    /**
     * An opaque string that specifies the cursor position after which results should be returned.
     */
    after?: string;
    /**
     * An OData expression (an expression that returns a boolean value) using the entity's fields to retrieve a subset of the results.
     */
    filter?: string;
    /**
     * An integer value that specifies the number of items to return. Default is 100.
     */
    first?: number;
    /**
     * Uses a comma-separated list of expressions to sort response items. Add 'desc' for descending order, otherwise it's ascending by default.
     */
    orderby?: string;
    /**
     * A comma separated list of fields to return in the response.
     */
    select?: string;
}
/**
 * Uri template for the request builder.
 */
export const UserRequestBuilderUriTemplate = "{+baseurl}/User{?%24after*,%24filter*,%24first*,%24orderby*,%24select*}";
/**
 * Mapper for query parameters from symbol name to serialization name represented as a constant.
 */
const UserRequestBuilderGetQueryParametersMapper: Record<string, string> = {
    "after": "%24after",
    "filter": "%24filter",
    "first": "%24first",
    "orderby": "%24orderby",
    "select": "%24select",
};
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const UserRequestBuilderNavigationMetadata: Record<Exclude<keyof UserRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    id: {
        navigationMetadata: IdRequestBuilderNavigationMetadata,
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const UserRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: UserRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory:  createUserGetResponseFromDiscriminatorValue,
        queryParametersMapper: UserRequestBuilderGetQueryParametersMapper,
    },
    post: {
        uriTemplate: UserRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory:  createUserPostResponseFromDiscriminatorValue,
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeUser,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
