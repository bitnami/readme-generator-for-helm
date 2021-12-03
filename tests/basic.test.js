/* eslint-disable */
const fs = require('fs');

const testValuesPath = `${__dirname}/test-values.yaml`; // File where the content will end after the tool is executed
const testReadmePath = `${__dirname}/test-readme.md`; // File where the content will end after the tool is executed
const expectedReadmePath = `${__dirname}/expected-readme.md`; // File that must result from executing the tool providing the test README and values
const testSchemaPath = `${__dirname}/test-schema.json`; // File where the content will end after the tool is executed
const expectedSchemaPath = `${__dirname}/expected-schema.json`; // File that must result from executing the tool providing the test README and values

const { runReadmeGenerator } = require('../index.js');

test('Check basic functionality', () => {
  // Run readme generator with the test files
  const options = {
    readme: testReadmePath,
    values: testValuesPath,
  };
  runReadmeGenerator(options);

  // Check the output is the expected one
  expect(fs.readFileSync(testReadmePath)).toEqual(fs.readFileSync(expectedReadmePath));
});

test('Check schema', () => {
  // Run readme generator with the test files
  const options = {
    schema: testSchemaPath,
    values: testValuesPath,
  };
  runReadmeGenerator(options);

  // Check the output is the expected one
  expect(fs.readFileSync(testSchemaPath)).toEqual(fs.readFileSync(expectedSchemaPath));
});
