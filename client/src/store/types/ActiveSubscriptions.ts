import * as deepstreamIO from 'deepstream.io-client-js';
import * as Immutable from 'immutable';

export type SubscriptionCallback = (data: any) => void;
export type ProjectSubscriptionMap = Immutable.Map<number, SubscriptionCallback>;

/** Data structure holds the set of active subscriptions. */
export interface ActiveSubscriptions {
  projects: ProjectSubscriptionMap;
  jobId: string;
  jobCallback: SubscriptionCallback;
}
