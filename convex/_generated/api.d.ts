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
import type * as auditLogs from "../auditLogs.js";
import type * as calendarReminders from "../calendarReminders.js";
import type * as careCases from "../careCases.js";
import type * as careClaims from "../careClaims.js";
import type * as careContacts from "../careContacts.js";
import type * as contactReplies from "../contactReplies.js";
import type * as coordinationEvents from "../coordinationEvents.js";
import type * as crons from "../crons.js";
import type * as groupChats from "../groupChats.js";
import type * as handler from "../handler.js";
import type * as http from "../http.js";
import type * as lib_anthropicClient from "../lib/anthropicClient.js";
import type * as lib_dateValidation from "../lib/dateValidation.js";
import type * as lib_digestComposer from "../lib/digestComposer.js";
import type * as lib_handles from "../lib/handles.js";
import type * as lib_knowledge_retrieveCareContext from "../lib/knowledge/retrieveCareContext.js";
import type * as lib_linqClient from "../lib/linqClient.js";
import type * as lib_memory from "../lib/memory.js";
import type * as lib_pipeline_careRouter from "../lib/pipeline/careRouter.js";
import type * as lib_pipeline_index from "../lib/pipeline/index.js";
import type * as lib_pipeline_promptBuilder from "../lib/pipeline/promptBuilder.js";
import type * as lib_pipeline_responseParser from "../lib/pipeline/responseParser.js";
import type * as lib_pipeline_types from "../lib/pipeline/types.js";
import type * as lib_promptContent from "../lib/promptContent.js";
import type * as lib_providers_googleCalendar from "../lib/providers/googleCalendar.js";
import type * as lib_reminderTiming from "../lib/reminderTiming.js";
import type * as lib_scheduleBackfill from "../lib/scheduleBackfill.js";
import type * as medications from "../medications.js";
import type * as memoryEntries from "../memoryEntries.js";
import type * as messages from "../messages.js";
import type * as mutations from "../mutations.js";
import type * as outreachAttempts from "../outreachAttempts.js";
import type * as reminders from "../reminders.js";
import type * as scheduleItems from "../scheduleItems.js";
import type * as testChat from "../testChat.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auditLogs: typeof auditLogs;
  calendarReminders: typeof calendarReminders;
  careCases: typeof careCases;
  careClaims: typeof careClaims;
  careContacts: typeof careContacts;
  contactReplies: typeof contactReplies;
  coordinationEvents: typeof coordinationEvents;
  crons: typeof crons;
  groupChats: typeof groupChats;
  handler: typeof handler;
  http: typeof http;
  "lib/anthropicClient": typeof lib_anthropicClient;
  "lib/dateValidation": typeof lib_dateValidation;
  "lib/digestComposer": typeof lib_digestComposer;
  "lib/handles": typeof lib_handles;
  "lib/knowledge/retrieveCareContext": typeof lib_knowledge_retrieveCareContext;
  "lib/linqClient": typeof lib_linqClient;
  "lib/memory": typeof lib_memory;
  "lib/pipeline/careRouter": typeof lib_pipeline_careRouter;
  "lib/pipeline/index": typeof lib_pipeline_index;
  "lib/pipeline/promptBuilder": typeof lib_pipeline_promptBuilder;
  "lib/pipeline/responseParser": typeof lib_pipeline_responseParser;
  "lib/pipeline/types": typeof lib_pipeline_types;
  "lib/promptContent": typeof lib_promptContent;
  "lib/providers/googleCalendar": typeof lib_providers_googleCalendar;
  "lib/reminderTiming": typeof lib_reminderTiming;
  "lib/scheduleBackfill": typeof lib_scheduleBackfill;
  medications: typeof medications;
  memoryEntries: typeof memoryEntries;
  messages: typeof messages;
  mutations: typeof mutations;
  outreachAttempts: typeof outreachAttempts;
  reminders: typeof reminders;
  scheduleItems: typeof scheduleItems;
  testChat: typeof testChat;
  users: typeof users;
  waitlist: typeof waitlist;
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
