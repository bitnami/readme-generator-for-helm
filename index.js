/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

const { createValuesObject, parseMetadataComments, generateMetadataObject } = require('./lib/parser');
const { checkKeys } = require('./lib/checker');
const { buildSections } = require('./lib/builder');
const { insertReadmeTable, exportMetadata } = require('./lib/render');

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
  const valuesFilePath = options.values;
  const readmeFilePath = options.readme;
  const metadataFilePath = options.metadata;

  if (!valuesFilePath) {
    throw new Error('Values file not provided');
  }

  if (!readmeFilePath && !metadataFilePath) {
    throw new Error('Nothing to do. Please provide a README file or Metadata output.');
  }

  const configPath = options.config ? options.config : `${__dirname}/config.json`;
  const CONFIG = require(configPath);
  const sections = getValuesSections(options);

  if (readmeFilePath) {
    insertReadmeTable(readmeFilePath, sections, CONFIG);
  }

  if (metadataFilePath) {
    const metadata = generateMetadataObject(sections, valuesFilePath);
    exportMetadata(metadataFilePath, metadata);
  }
}

module.exports = {
  getValuesSections,
  runReadmeGenerator,
};
