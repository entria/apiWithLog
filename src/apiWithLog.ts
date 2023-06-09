import { getRequestMock, saveRequestMock } from './apiCache';
import { apiDebug } from './apiDebug';
import { apiReport } from './apiReport';
import { cloneResponse } from './cloneResponse';
import { timeSpan } from './timeSpan';


type RequestOptions = RequestInit & {
  shouldReport?: boolean;
};
export const apiWithLog = async (
  init: RequestInfo,
  optionsApi: RequestOptions = { method: 'GET' },
): Promise<Response> => {
  const end = timeSpan();

  const options = {
    ...optionsApi,
    headers: {
      ...(optionsApi.headers || {}),
      'user-agent': 'node-fetch',
    },
  };

  const requestMock = await getRequestMock(init, options);

  if (requestMock) {
    return requestMock;
  }

  return fetch(init, options).then(async (response) => {
    const durationTime = end();

    const text = await response.text();

    let json: any = null;

    try {
      json = JSON.parse(text);
    } catch (err) {
      // eslint-disable-next-line
    }

    const getBody = (): Record<string, string> => {
      if (json) {
        return {
          json,
        };
      }

      return {
        text,
      };
    };

    await saveRequestMock(init, options, text, response);

    apiDebug({
      init,
      options,
      durationTime,
      getBody,
      response,
    });

    await apiReport({
      init,
      options,
      durationTime,
      getBody,
      response,
      json,
      text,
    });

    const { responseCopy } = await cloneResponse(response, text);

    return responseCopy;
  });
};
