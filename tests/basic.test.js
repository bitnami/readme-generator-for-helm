const fs = require('fs');

const testValuesPath = `${__dirname}/test-values.yaml`; // File where the content will end after the tool is executed
const testReadmePath = `${__dirname}/test-readme.md`; // File where the content will end after the tool is executed
const expectedReadmePath = `${__dirname}/expected-readme.md`; // File that must result from executing the tool providing the test README and values

const { runReadmenator } = require('../index.js');

test('Check basic functionality', () => {
  // Run readmenator with the test files
  const options = {
    readme: testReadmePath,
    values: testValuesPath,
  };
  runReadmenator(options);

  // Check the output is the expected one
  expect(fs.readFileSync(testReadmePath)).toEqual(fs.readFileSync(expectedReadmePath));
});
