import test from 'node:test';
import assert from 'node:assert/strict';

import {
  __testing,
  addFileSource,
  addUrlSource,
  createNotebook,
  generateAudio,
  generateDataTable,
  generateFlashcards,
  generateInfographic,
  generateQuiz,
  generateReport,
  generateSlideDeck,
  generateVideo,
  InfographicDetail,
  InfographicOrientation,
  InfographicStyle,
  listArtifactStatuses,
  listSources,
  VideoFormat,
  VideoStyle,
} from '../notebooklm-api.js';

const TOKEN_HTML = '"SNlM0e":"csrf-token","FdrFJe":"session-id"';

function mockResponse({ status = 200, body = '', headers = {}, url = 'https://notebooklm.google.com/' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    url,
    headers: new Headers(headers),
    async text() {
      return body;
    },
  };
}

function tokenResponse(token = 'csrf-token') {
  return mockResponse({ body: `"SNlM0e":"${token}","FdrFJe":"session-id"` });
}

function rpcResponse(methodId, result) {
  const envelope = [['wrb.fr', methodId, JSON.stringify(result)]];
  return mockResponse({ body: `)]}'\n${JSON.stringify(envelope)}` });
}

function decodeRpcParams(options) {
  const body = new URLSearchParams(options.body);
  const request = JSON.parse(body.get('f.req'));
  return JSON.parse(request[0][0][1]);
}

function installFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return handler(String(url), options, calls.length);
  };
  return calls;
}

function reset() {
  __testing.resetTokens();
  __testing.setRetrySleep(async () => {});
  __testing.setMutationTimeout(15000);
}

test.beforeEach(reset);

test('request option factories return fresh canonical envelopes', () => {
  const firstTemplate = __testing.requestTemplateOptions();
  const secondTemplate = __testing.requestTemplateOptions();
  firstTemplate[3][0] = 99;
  assert.deepEqual(secondTemplate, [
    2, null, null,
    [1, null, null, null, null, null, null, null, null, null, [1]],
  ]);

  const firstArtifact = __testing.artifactClientOptions();
  const secondArtifact = __testing.artifactClientOptions();
  firstArtifact[4][0][0] = 99;
  assert.deepEqual(secondArtifact, [
    2, null, null,
    [1, null, null, null, null, null, null, null, null, null, [1]],
    [[1, 4, 8, 2, 3, 6]],
  ]);
});

test('visual style enums match the current NotebookLM wire values', () => {
  assert.deepEqual(VideoStyle, {
    AUTO_SELECT: 1,
    CUSTOM: 0,
    CLASSIC: 2,
    WHITEBOARD: 3,
    KAWAII: 9,
    ANIME: 7,
    WATERCOLOR: 6,
    RETRO_PRINT: 8,
    HERITAGE: 4,
    PAPER_CRAFT: 5,
  });
  assert.deepEqual(InfographicStyle, {
    AUTO_SELECT: 1,
    SKETCH_NOTE: 2,
    PROFESSIONAL: 3,
    BENTO_GRID: 4,
    EDITORIAL: 5,
    INSTRUCTIONAL: 6,
    BRICKS: 7,
    CLAY: 8,
    ANIME: 9,
    KAWAII: 10,
    SCIENTIFIC: 11,
  });
});

test('notebook creation uses the migrated template block', async () => {
  let params;
  installFetch((url, options) => {
    if (url.endsWith('/')) return tokenResponse();
    params = decodeRpcParams(options);
    return rpcResponse(__testing.RPCMethod.CREATE_NOTEBOOK, [['notebook-id-12345']]);
  });

  const notebook = await createNotebook('Compatibility test');
  assert.equal(notebook.id, 'notebook-id-12345');
  assert.deepEqual(params, ['Compatibility test', null, null, __testing.requestTemplateOptions()]);
});

test('URL source addition uses the migrated source spec and template block', async () => {
  let params;
  installFetch((url, options) => {
    if (url.endsWith('/')) return tokenResponse();
    params = decodeRpcParams(options);
    return rpcResponse(__testing.RPCMethod.ADD_SOURCE, [['source-id-12345']]);
  });

  await addUrlSource('notebook-id-12345', 'https://example.com/source');
  assert.deepEqual(params, [
    [[null, null, ['https://example.com/source'], null, null, null, null, null, null, null, 1]],
    'notebook-id-12345',
    __testing.requestTemplateOptions(),
  ]);
});

test('URL source addition reconciles a committed mutation after its response stalls', async () => {
  const sourceUrl = 'https://example.com/committed-source';
  __testing.setMutationTimeout(1);
  let probeCount = 0;

  installFetch((url, options) => {
    if (url.endsWith('/')) return tokenResponse();

    const methodId = new URL(url).searchParams.get('rpcids');
    if (methodId === __testing.RPCMethod.ADD_SOURCE) {
      const response = mockResponse();
      response.text = async () => new Promise(() => {});
      return response;
    }

    if (methodId === __testing.RPCMethod.GET_NOTEBOOK) {
      probeCount++;
      if (probeCount === 1) {
        return rpcResponse(__testing.RPCMethod.GET_NOTEBOOK, [[null, []]]);
      }
      const metadata = [null, null, null, null, null, null, null, [sourceUrl]];
      const source = [['source-id-committed'], sourceUrl, metadata, [null, 2]];
      return rpcResponse(__testing.RPCMethod.GET_NOTEBOOK, [[null, [source]]]);
    }

    throw new Error(`Unexpected URL ${url}`);
  });

  const source = await addUrlSource('notebook-id-12345', sourceUrl);
  assert.equal(source.id, 'source-id-committed');
  assert.equal(source.title, sourceUrl);
  assert.equal(source.url, sourceUrl);
  assert.equal(probeCount, 2);
});

test('file upload registers with the migrated block and sends the MIME type', async () => {
  let registerParams;
  let uploadStartHeaders;
  let finalized = false;
  installFetch((url, options) => {
    if (url === 'https://notebooklm.google.com/') return tokenResponse();
    if (url.includes('batchexecute')) {
      registerParams = decodeRpcParams(options);
      return rpcResponse(__testing.RPCMethod.ADD_SOURCE_FILE, [['source-id-12345']]);
    }
    if (url.startsWith('https://notebooklm.google.com/upload/_/')) {
      uploadStartHeaders = options.headers;
      return mockResponse({ headers: { 'x-goog-upload-url': 'https://upload.example/finalize' } });
    }
    if (url === 'https://upload.example/finalize') {
      finalized = true;
      return mockResponse();
    }
    throw new Error(`Unexpected URL ${url}`);
  });

  await addFileSource('notebook-id-12345', 'paper.pdf', [1, 2, 3], 'application/pdf');
  assert.deepEqual(registerParams, [
    [['paper.pdf']],
    'notebook-id-12345',
    __testing.requestTemplateOptions(),
  ]);
  assert.equal(uploadStartHeaders['x-goog-upload-header-content-type'], 'application/pdf');
  assert.equal(finalized, true);
});

test('all CREATE_ARTIFACT builders use the full capability envelope', async () => {
  const captured = [];
  installFetch((url, options) => {
    if (url.endsWith('/')) return tokenResponse();
    captured.push(decodeRpcParams(options));
    return rpcResponse(__testing.RPCMethod.CREATE_ARTIFACT, [['artifact-id-12345']]);
  });

  const notebookId = 'notebook-id-12345';
  const sourceIds = ['source-id-12345'];
  await generateAudio(notebookId, sourceIds);
  await generateVideo(notebookId, sourceIds);
  await generateReport(notebookId, sourceIds);
  await generateQuiz(notebookId, sourceIds);
  await generateFlashcards(notebookId, sourceIds);
  await generateSlideDeck(notebookId, sourceIds);
  await generateDataTable(notebookId, sourceIds);
  await generateInfographic(notebookId, sourceIds);

  assert.equal(captured.length, 8);
  for (const params of captured) {
    assert.deepEqual(params[0], __testing.artifactClientOptions());
  }
});

test('video styles use corrected wire values and custom prompt serialization', async () => {
  const captured = [];
  installFetch((url, options) => {
    if (url.endsWith('/')) return tokenResponse();
    captured.push(decodeRpcParams(options));
    return rpcResponse(__testing.RPCMethod.CREATE_ARTIFACT, [['artifact-id-12345']]);
  });

  await generateVideo(
    'notebook-id-12345', ['source-id-12345'], VideoFormat.EXPLAINER,
    VideoStyle.WHITEBOARD, 'Explain the evidence', 'en'
  );
  await generateVideo(
    'notebook-id-12345', ['source-id-12345'], VideoFormat.EXPLAINER,
    VideoStyle.CUSTOM, 'Explain the evidence', 'en', 'Use monochrome line art'
  );

  assert.equal(captured[0][2][8][2][5], 3);
  assert.equal(captured[1][2][8][2][5], null);
  assert.equal(captured[1][2][8][2][6], 'Use monochrome line art');
});

test('infographic native style is placed in the sixth configuration slot', async () => {
  let params;
  installFetch((url, options) => {
    if (url.endsWith('/')) return tokenResponse();
    params = decodeRpcParams(options);
    return rpcResponse(__testing.RPCMethod.CREATE_ARTIFACT, [['artifact-id-12345']]);
  });

  await generateInfographic(
    'notebook-id-12345', ['source-id-12345'], 'ko',
    InfographicOrientation.PORTRAIT, InfographicDetail.DETAILED,
    InfographicStyle.SCIENTIFIC, 'Use a timeline layout'
  );

  assert.deepEqual(params[2][14][0], ['Use a timeline layout', 'ko', null, 2, 3, 11]);
});

test('safe reads retry 429 and 5xx responses and honor Retry-After', async () => {
  const sleeps = [];
  __testing.setRetrySleep(async ms => sleeps.push(ms));
  let rpcAttempts = 0;
  installFetch(url => {
    if (url.endsWith('/')) return tokenResponse();
    rpcAttempts++;
    if (rpcAttempts === 1) return mockResponse({ status: 429, headers: { 'retry-after': '0' } });
    if (rpcAttempts === 2) return mockResponse({ status: 503 });
    return rpcResponse(__testing.RPCMethod.GET_NOTEBOOK, [[null, []]]);
  });

  const sources = await listSources('notebook-id-12345');
  assert.deepEqual(sources, []);
  assert.equal(rpcAttempts, 3);
  assert.deepEqual(sleeps, [0, 2000]);
});

test('safe reads retry network failures', async () => {
  let rpcAttempts = 0;
  installFetch(url => {
    if (url.endsWith('/')) return tokenResponse();
    rpcAttempts++;
    if (rpcAttempts < 3) throw new Error('connection reset');
    return rpcResponse(__testing.RPCMethod.GET_NOTEBOOK, [[null, []]]);
  });

  await listSources('notebook-id-12345');
  assert.equal(rpcAttempts, 3);
});

test('safe read retry exhaustion returns an actionable error', async () => {
  let rpcAttempts = 0;
  installFetch(url => {
    if (url.endsWith('/')) return tokenResponse();
    rpcAttempts++;
    return mockResponse({ status: 503 });
  });

  await assert.rejects(
    () => listSources('notebook-id-12345'),
    /failed after 3 attempts/
  );
  assert.equal(rpcAttempts, 3);
});

test('confirmed authentication failure refreshes tokens and retries once', async () => {
  let homepageCalls = 0;
  let rpcAttempts = 0;
  installFetch(url => {
    if (url.endsWith('/')) {
      homepageCalls++;
      return tokenResponse(`csrf-${homepageCalls}`);
    }
    rpcAttempts++;
    if (rpcAttempts === 1) return mockResponse({ status: 401 });
    return rpcResponse(__testing.RPCMethod.GET_NOTEBOOK, [[null, []]]);
  });

  await listSources('notebook-id-12345');
  assert.equal(homepageCalls, 2);
  assert.equal(rpcAttempts, 2);
});

test('mutating calls are not retried after an ambiguous transient failure', async () => {
  let rpcAttempts = 0;
  installFetch(url => {
    if (url.endsWith('/')) return tokenResponse();
    rpcAttempts++;
    return mockResponse({ status: 503 });
  });

  await assert.rejects(
    () => createNotebook('Do not duplicate'),
    error => error.code === 'TRANSIENT_MUTATION_UNCERTAIN'
  );
  assert.equal(rpcAttempts, 1);
});

test('mutating calls are not retried after a network failure', async () => {
  let rpcAttempts = 0;
  installFetch(url => {
    if (url.endsWith('/')) return tokenResponse();
    rpcAttempts++;
    throw new Error('connection reset');
  });

  await assert.rejects(
    () => createNotebook('Do not duplicate'),
    error => error.code === 'TRANSIENT_MUTATION_UNCERTAIN'
  );
  assert.equal(rpcAttempts, 1);
});

test('completed media waits for its URL before reporting completion', async () => {
  let rpcAttempts = 0;
  installFetch(url => {
    if (url.endsWith('/')) return tokenResponse();
    rpcAttempts++;
    const artifact = [];
    artifact[0] = 'artifact-id-12345';
    artifact[2] = 1;
    artifact[4] = 3;
    if (rpcAttempts === 2) {
      artifact[6] = [];
      artifact[6][5] = [['https://media.example/audio.mp3']];
    }
    return rpcResponse(__testing.RPCMethod.LIST_ARTIFACTS, [[artifact]]);
  });

  const settling = await listArtifactStatuses('notebook-id-12345');
  const ready = await listArtifactStatuses('notebook-id-12345');
  assert.equal(settling.get('artifact-id-12345').status, 'in_progress');
  assert.equal(ready.get('artifact-id-12345').status, 'completed');
});
