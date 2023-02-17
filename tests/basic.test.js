/* eslint-disable */
const fs = require('fs');
const temp = require('temp').track();

const expectedReadmeFirstExecution = `${__dirname}/expected-readme.first-execution.md`; // File that must result from executing the tool providing a readme file with only '### Parameters' and values
const testValuesPath = `${__dirname}/test-values.yaml`; // File where the content will end after the tool is executed
const testReadmeSubsequentSectionsPath = `${__dirname}/test-readme.md`; // File where the content will end after the tool is executed
const expectedReadmeSubsequentSectionsPath = `${__dirname}/expected-readme.md`; // File that must result from executing the tool providing the test README and values
const testReadmeLastSectionPath = `${__dirname}/test-readme.last-section.md`; // File where the content will end after the tool is executed
const expectedReadmeLastSectionPath = `${__dirname}/expected-readme.last-section.md`; // File that must result from executing the tool providing the test README and values
const testReadmeLastSectionWithTextBelowPath = `${__dirname}/test-readme.last-section-text-below.md`; // File where the content will end after the tool is executed
const expectedReadmeLastSectionWithTextBelowPath = `${__dirname}/expected-readme.last-section-text-below.md`; // File that must result from executing the tool providing the test README and values
const testSchemaPath = `${__dirname}/test-schema.json`; // File where the content will end after the tool is executed
const expectedSchemaPath = `${__dirname}/expected-schema.json`; // File that must result from executing the tool providing the test README and values

const { runReadmeGenerator } = require('../index.js');

test('Check basic functionality. First execution', () => {
  // Create empty temp file with 'Parameters' section
  let tempFile = temp.path({ prefix: 'readme-generator'});
  let parametersHeader = "# Example\r\n\n## Parameters";
  fs.writeFileSync(tempFile, parametersHeader);
  // Run readme generator with the test files
  const options = {
    readme: tempFile,
    values: testValuesPath,
  };
  runReadmeGenerator(options);
  // Check the output is the expected one
  expect(fs.readFileSync(tempFile)).toEqual(fs.readFileSync(expectedReadmeFirstExecution));
  // Clean temporary file
  temp.cleanupSync();
});

test('Check basic functionality', () => {
  // Run readme generator with the test files
  const options = {
    readme: testReadmeSubsequentSectionsPath,
    values: testValuesPath,
  };
  runReadmeGenerator(options);

  // Check the output is the expected one
  expect(fs.readFileSync(testReadmeSubsequentSectionsPath)).toEqual(fs.readFileSync(expectedReadmeSubsequentSectionsPath));
});

test('Check basic functionality as last in README', () => {
  // Run readme generator with the test files
  const options = {
    readme: testReadmeLastSectionPath,
    values: testValuesPath,
  };
  runReadmeGenerator(options);

  // Check the output is the expected one
  expect(fs.readFileSync(testReadmeLastSectionPath)).toEqual(fs.readFileSync(expectedReadmeLastSectionPath));
});

test('Check basic functionality as last section in README but with text below', () => {
  // Run readme generator with the test files
  const options = {
    readme: testReadmeLastSectionWithTextBelowPath,
    values: testValuesPath,
  };
  runReadmeGenerator(options);

  // Check the output is the expected one
  expect(fs.readFileSync(testReadmeLastSectionWithTextBelowPath)).toEqual(fs.readFileSync(expectedReadmeLastSectionWithTextBelowPath));
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
