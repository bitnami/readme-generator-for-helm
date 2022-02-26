/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

const { createValuesObject, parseMetadataComments, appendDependencies } = require('./lib/parser');
const { checkKeys } = require('./lib/checker');
const { combineMetadataAndValues, buildSectionsArrays, buildParamsToRenderList } = require('./lib/builder');
const { insertReadmeTable, renderOpenAPISchema } = require('./lib/render');

async function getParameters(options) {
  const valuesFilePath = options.values;
  const dependencyPath = options.dependency;
  const configPath = options.config ? options.config : `${__dirname}/config.json`;
  const CONFIG = require(configPath);

  const valuesObject = createValuesObject(valuesFilePath);
  const valuesMetadata = parseMetadataComments(valuesFilePath, CONFIG);

  // Check the parsed keys are consistent with the real ones
  checkKeys(valuesObject, valuesMetadata);

  // Combine after the check
  // valuesMetadata is modified and filled with more info
  combineMetadataAndValues(valuesObject, valuesMetadata);

  if (dependencyPath) {
    await appendDependencies(dependencyPath, valuesMetadata)
  }
  
  return valuesMetadata;
}

async function runReadmeGenerator(options) {
  const valuesFilePath = options.values;
  const readmeFilePath = options.readme;
  const schemaFilePath = options.schema;

  if (!readmeFilePath && !schemaFilePath) {
    throw new Error('Nothing to do. Please provide a README file or Schema file output.');
  }
  if (!valuesFilePath) {
    throw new Error('Values file not provided');
  }

  const configPath = options.config ? options.config : `${__dirname}/config.json`;
  const CONFIG = require(configPath);
  const parametersList = await getParameters(options);

  if (readmeFilePath) {
    const paramsToRender = buildParamsToRenderList(parametersList, CONFIG);
    const sections = buildSectionsArrays(paramsToRender);
    insertReadmeTable(readmeFilePath, sections, CONFIG);
  }

  if (schemaFilePath) {
    renderOpenAPISchema(schemaFilePath, parametersList);
  }
}

module.exports = {
  runReadmeGenerator,
};
