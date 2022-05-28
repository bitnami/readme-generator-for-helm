/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

const fs = require('fs');

const { createValuesObject, parseMetadataComments } = require('./lib/parser');
const { checkKeys } = require('./lib/checker');
const { combineMetadataAndValues, buildSectionsObjects, buildParamsToRenderList } = require('./lib/builder');
const { insertReadmeTable, renderOpenAPISchema } = require('./lib/render');

/*
* Parses the given values file for all metadata comments and returns an object containing
* Returns an object with following structure:
* {
*   'parsedValues': [],              // contains all parameter related data
*   'parsedSectionDescriptions': [], // contains key-value pairs of section name (key) and an array of lines for a description (value)
* }
*/
function getParsingResults(options) {
  const valuesFilePath = options.values;
  const configPath = options.config ? options.config : `${__dirname}/config.json`;
  const config = require(configPath);

  return parseMetadataComments(valuesFilePath, config);
}

function getParameters(valuesFilePath, valuesMetadata) {
  const valuesObject = createValuesObject(valuesFilePath);

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
    const parsedMetadataComments = getParsingResults(options);
    const parametersList = getParameters(options.values, parsedMetadataComments.parsedValues);

    if (readmeFilePath) {
      const paramsToRender = buildParamsToRenderList(parametersList, config);
      const sections = buildSectionsObjects(paramsToRender, parsedMetadataComments.parsedSectionDescriptions);
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
