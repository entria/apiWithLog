import fs from 'fs';
import path from 'path';
import util from 'util';
import writeFileAtomicCallback from 'write-file-atomic';

import { debugConsole } from './debugConsole';

import { cloneResponse } from './cloneResponse';
import { getCurl } from './getCurl';

const readFile = util.promisify(fs.readFile);
// const writeFile = util.promisify(fs.writeFile);
const writeFileAtomic = util.promisify(writeFileAtomicCallback);
const cwd = process.cwd();
const dirPath = 'mock-requests.json';

const output = path.join(cwd, dirPath);

export const getRequestKey = (init: RequestInfo, options: RequestInit) => {
  if (!options?.body) {
    return `${options.method}:${init}`;
  }

  return `${options.method}:${init}:${JSON.stringify(options.body)}`;
};

export const saveRequestMock = async (
  init: RequestInfo,
  options: RequestInit,
  text: string,
  response: Response & { size?: number },
) => {
  if (process.env.WRITE_MOCK !== 'true') {
    return;
  }

  // only save ok requests 200
  if (!response.ok) {
    return;
  }

  const requestKey = getRequestKey(init, options);

  let dataString = null;

  try {
    dataString = await readFile(output, 'utf8');

    console.log(dataString);
  } catch (err) {
    // eslint-disable-next-line
    console.log({ err });
  }

  try {
    const currentMock = dataString ? JSON.parse(dataString) : {};

    const newRequest = {
      text: JSON.parse(text),
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response?.ok,
        size: response?.size,
        url: response?.url,
      },
    };
    const newMock = {
      ...currentMock,
      [requestKey]: newRequest,
    };

    const newMockString = JSON.stringify(newMock, null, 2);

    await writeFileAtomic(output, newMockString);

    //eslint-disable-next-line
    console.log(`saved to ${output}`);
  } catch (err) {
    // eslint-disable-next-line
    console.log({ err });
  }
};

export const getRequestMock = async (
  init: RequestInfo,
  options: RequestInit & { agent?: string },
) => {
  if (process.env.USE_MOCK !== 'true') {
    return;
  }

  const requestKey = getRequestKey(init, options);

  try {
    const dataString = await readFile(output, 'utf8');

    if (!dataString) {
      return null;
    }

    const currentMock = JSON.parse(dataString);

    const mock = currentMock[requestKey];

    if (!mock) {
      return null;
    }

    const { text, response } = mock;

    const { responseCopy } = await cloneResponse(response, text);

    // eslint-disable-next-line
    console.log('mock-cache: ', requestKey);

    if (process.env.DEBUG === 'true') {
      // eslint-disable-next-line
      const { agent, ...optionsWithoutAgent } = options;

      const curl = getCurl(init, options);

      const getBody = () => {
        let json = null;

        try {
          json = JSON.parse(text);
        } catch (err) {}

        if (json) {
          return {
            json,
          };
        }

        return {
          text,
        };
      };

      // eslint-disable-next-line
      debugConsole({
        init,
        options: optionsWithoutAgent,
        ...getBody(),
        ok: response.ok,
        status: response.status,
        curl,
      });
    }

    return responseCopy;
  } catch (err) {
    // eslint-disable-next-line
    console.log({ err });
  }

  return null;
};
