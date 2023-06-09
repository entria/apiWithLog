import * as Sentry from '@sentry/node';

import prettyFormat from 'pretty-format';

import { getCurl } from './getCurl';

// implement
const shouldReport = (...args: unknown[]) => false;
// implement
const sendtoSlack = (...args: unknown[]) => {};

type ApiReport = {
  init: RequestInfo;
  options: RequestInit & { shouldReport?: boolean | string };
  durationTime: number;
  getBody: () => Record<string, string>;
  response: Response;
  json: Record<string, string>;
  text: string;
};
export const apiReport = async ({
  init,
  options,
  getBody,
  response,
  json,
  text,
}: ApiReport) => {
  const canReport =
    typeof options?.shouldReport === 'boolean' ? options.shouldReport : true;

  if (canReport && shouldReport(init, response, json, text)) {
    const info = {
      url: init,
      method: options.method,
      body: options.body,
      status: response.status,
      ...getBody(),
    };

    const curl = getCurl(init, options);

    // do not send to slack error 500
    if (response.status >= 500) {
      // some external api is not working well
      await sendtoSlack({
        channel: 'pix',
        icon_emoji: 'bug',
        attachments: [
          {
            text: prettyFormat(info),
          },
          {
            text: curl,
          },
        ],
      });
    }

    const error = new Error(prettyFormat(info));

    Sentry.setExtra('error', error);
    Sentry.setExtra('curl', curl);
    Sentry.captureException(error);
  }
};
