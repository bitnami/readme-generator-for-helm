/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

const { createValuesObject, parseMetadataComments } = require('./lib/parser');
const { checkKeys } = require('./lib/checker');
const { buildSections } = require('./lib/builder');
const { insertReadmeTable } = require('./lib/render');

function getValuesSections(options) {
  const valuesFilePath = options.values;
  const configPath = options.config ? options.config : `${__dirname}/config.json`;
  const CONFIG = require(configPath);

  const valuesObject = createValuesObject(valuesFilePath);
  let valuesMetadata = parseMetadataComments(valuesFilePath, CONFIG);

  // Check the parsed keys are consistent with the real ones
  checkKeys(valuesObject, valuesMetadata);

  // We don't need the skip objects anymore so filter them
  valuesMetadata = valuesMetadata.filter((el) => (!el.skip));

  // Return sections array combining metadata and real values
  return buildSections(valuesObject, valuesMetadata);
}

function runReadmeGenerator(options) {
  const readmeFilePath = options.readme;
  const valuesFilePath = options.values;

  if (!readmeFilePath) {
    throw new Error('README file not provided');
  }
  if (!valuesFilePath) {
    throw new Error('Values file not provided');
  }

  const configPath = options.config ? options.config : `${__dirname}/config.json`;
  const CONFIG = require(configPath);

  const sections = getValuesSections(options);

  insertReadmeTable(readmeFilePath, sections, CONFIG);
}

module.exports = {
  getValuesSections,
  runReadmeGenerator,
};
