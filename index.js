/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

const fs = require('fs');

const { createValuesObject, parseMetadataComments } = require('./lib/parser');
const { checkKeys } = require('./lib/checker');
const { combineMetadataAndValues, buildSectionsArrays, buildParamsToRenderList } = require('./lib/builder');
const { insertReadmeTable, renderOpenAPISchema } = require('./lib/render');

function getParameters(options) {
  const valuesFilePath = options.values;
  const configPath = options.config ? options.config : `${__dirname}/config.json`;
  const config = require(configPath);

  const valuesObject = createValuesObject(valuesFilePath);
  const valuesMetadata = parseMetadataComments(valuesFilePath, config);

  // Check the parsed keys are consistent with the real ones
  checkKeys(valuesObject, valuesMetadata);

  // Combine after the check
  // valuesMetadata is modified and filled with more info
  combineMetadataAndValues(valuesObject, valuesMetadata);

  return valuesMetadata;
}

function runReadmeGenerator(options) {
  const valuesFilePath = options.values;
  const readmeFilePath = options.readme;
  const schemaFilePath = options.schema;
  const versionFlag = options.version;

  if (versionFlag) {
    console.log("Version:", JSON.parse(fs.readFileSync('./package.json')).version);
  } else {
    if (!readmeFilePath && !schemaFilePath) {
      throw new Error('Nothing to do. Please provide the --readme or --schema options.');
    }
    if (!valuesFilePath) {
      throw new Error('Nothing to do. You must provide the --value option');
    }
    const configPath = options.config ? options.config : `${__dirname}/config.json`;
    const config = JSON.parse(fs.readFileSync(configPath));
    const parametersList = getParameters(options);

    if (readmeFilePath) {
      const paramsToRender = buildParamsToRenderList(parametersList, config);
      const sections = buildSectionsArrays(paramsToRender);
      insertReadmeTable(readmeFilePath, sections, config);
    }

    if (schemaFilePath) {
      renderOpenAPISchema(schemaFilePath, parametersList, config);
    }
  }
}

module.exports = {
  runReadmeGenerator,
};
