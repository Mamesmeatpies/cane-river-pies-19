/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as contactMessages from "../contactMessages.js";
import type * as crons from "../crons.js";
import type * as directMessages from "../directMessages.js";
import type * as marketingDrafts from "../marketingDrafts.js";
import type * as marketingGenerator from "../marketingGenerator.js";
import type * as marketingOutputs from "../marketingOutputs.js";
import type * as newsletterSubscribers from "../newsletterSubscribers.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  analytics: typeof analytics;
  contactMessages: typeof contactMessages;
  crons: typeof crons;
  directMessages: typeof directMessages;
  marketingDrafts: typeof marketingDrafts;
  marketingGenerator: typeof marketingGenerator;
  marketingOutputs: typeof marketingOutputs;
  newsletterSubscribers: typeof newsletterSubscribers;
  notifications: typeof notifications;
  orders: typeof orders;
  products: typeof products;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
