/**
 * Unit tests for DescriptiveStatistics/examine.worker.js
 */
const path = require('path');

function loadWorker() {
  global.self = global;
  global.importScripts = (...urls) => {
    urls.forEach((u) => {
      // Skip external CDN imports in tests
      if (/^https?:\/\//i.test(u)) return;
      const localPath = path.join(process.cwd(), 'public', u.replace(/^\/+/, ''));
      delete require.cache[require.resolve(localPath)];
      require(localPath);
    });
  };

  require(path.join(process.cwd(), 'public/workers/DescriptiveStatistics/libs/utils/utils.js'));

  const workerPath = path.join(process.cwd(), 'public/workers/DescriptiveStatistics/examine.worker.js');
  delete require.cache[require.resolve(workerPath)];
  require(workerPath);
}

describe('examine.worker', () => {
  test('posts success with results for simple payload', () => {
    const postSpy = jest.fn();
    global.postMessage = postSpy;
    loadWorker();

    const variable = { name: 'Score', measure: 'scale', type: 'numeric' };
    const data = [10, 20, 30, 40, null];
    const caseNumbers = [1, 2, 3, 4, 5];

    global.onmessage({ data: { variable, data, caseNumbers, options: {} } });

    expect(postSpy).toHaveBeenCalledTimes(1);
    const payload = postSpy.mock.calls[0][0];
    expect(payload.status).toBe('success');
    expect(payload.variableName).toBe('Score');
    expect(payload.results).toBeDefined();
  });

  test('treats unknown numeric as scale and computes trimmed mean and percentiles', () => {
    const postSpy = jest.fn();
    global.postMessage = postSpy;
    loadWorker();

    const variable = { name: 'Score', measure: 'unknown', type: 'numeric' };
    const data = [10, 20, 30, 40, null];

    global.onmessage({ data: { variable, data, caseNumbers: [1,2,3,4,5], options: { percentileMethod: 'haverage' } } });

    const payload = postSpy.mock.calls[0][0];
    expect(payload.status).toBe('success');
    expect(payload.results.descriptives.Mean).toBeCloseTo(25, 10);
    expect(payload.results.trimmedMean).toBeGreaterThan(10);
    expect(payload.results.percentiles).toBeDefined();
  });

  test('handles ordinal data for percentiles and IQR via hinges', () => {
    const postSpy = jest.fn();
    global.postMessage = postSpy;
    loadWorker();

    const variable = { name: 'Likert', measure: 'ordinal', type: 'numeric' };
    const data = [1, 2, 2, 3, 4];

    global.onmessage({ data: { variable, data, caseNumbers: [1,2,3,4,5], options: {} } });

    const payload = postSpy.mock.calls[0][0];
    expect(payload.status).toBe('success');
    expect(payload.results.descriptives.Median).toBeDefined();
    // Hinges should be present and IQR added to descriptives
    expect(payload.results.hinges).toBeDefined();
    expect(payload.results.descriptives.IQR).toBeDefined();
  });

  test('returns Kolmogorov-Smirnov and Shapiro-Wilk results when normality tests are requested', () => {
    const postSpy = jest.fn();
    global.postMessage = postSpy;
    loadWorker();

    const variable = { name: 'Score', measure: 'scale', type: 'numeric' };
    const data = [10, 12, 11, 13, 14, 10, 12, 11];

    global.onmessage({ data: { variable, data, caseNumbers: [1,2,3,4,5,6,7,8], options: { showNormalityPlots: true } } });

    const payload = postSpy.mock.calls[0][0];
    expect(payload.status).toBe('success');
    expect(payload.results.normalityTests).toBeDefined();
    expect(payload.results.normalityTests.kolmogorovSmirnov).toBeDefined();
    expect(payload.results.normalityTests.shapiroWilk).toBeDefined();
    expect(Array.isArray(payload.results.normalityTests.tests)).toBe(true);
    expect(payload.results.normalityTests.tests).toHaveLength(2);
  });

  test('returns normality results for NUMERIC variable with nominal measure', () => {
    const postSpy = jest.fn();
    global.postMessage = postSpy;
    loadWorker();

    const variable = { name: 'ScoreNominal', measure: 'nominal', type: 'NUMERIC' };
    const data = [1, 2, 3, 2, 4, 5, 3, 2, 1];

    global.onmessage({
      data: {
        variable,
        data,
        caseNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        options: { showNormalityPlots: true },
      },
    });

    const payload = postSpy.mock.calls[0][0];
    expect(payload.status).toBe('success');
    expect(payload.results.normalityTests).toBeDefined();
    expect(payload.results.normalityTests.kolmogorovSmirnov).toBeDefined();
    expect(payload.results.normalityTests.shapiroWilk).toBeDefined();
  });
});



