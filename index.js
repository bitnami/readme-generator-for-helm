/*
* Copyright Broadcom, Inc. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
*/

import fs from 'node:fs';
import pjson from './package.json' with { type: "json" };

import { createValuesObject, parseMetadataComments } from './lib/parser.js';
import checkKeys from './lib/checker.js';
import { combineMetadataAndValues, buildParamsToRenderList } from './lib/builder.js';
import { insertReadmeTable, renderOpenAPISchema } from './lib/render.js';

// Common alias for __dirname not available in ESM
const __dirname = import.meta.dirname;

function getParsedMetadata(valuesFilePath, config) {
  const valuesObject = createValuesObject(valuesFilePath);
  const valuesMetadata = parseMetadataComments(valuesFilePath, config);

  // Check the parsed keys are consistent with the real ones
  checkKeys(valuesObject, valuesMetadata.parameters);

  // Combine after the check
  // valuesMetadata is modified and filled with more info
  combineMetadataAndValues(valuesObject, valuesMetadata.parameters);

  return valuesMetadata;
}

export default function runReadmeGenerator(options) {
  const valuesFilePath = options.values;
  const readmeFilePath = options.readme;
  const schemaFilePath = options.schema;
  const versionFlag = options.version;

  if (versionFlag) {
    console.log('Version:', pjson.version);
  } else {
    if (!readmeFilePath && !schemaFilePath) {
      throw new Error('Nothing to do. Please provide the --readme or --schema options.');
    }
    if (!valuesFilePath) {
      throw new Error('Nothing to do. You must provide the --values option');
    }
    const configPath = options.config ? options.config : `${__dirname}/config.json`;
    const config = JSON.parse(fs.readFileSync(configPath));
    const parsedMetadata = getParsedMetadata(options.values, config);

    if (readmeFilePath) {
      /* eslint no-param-reassign: ["error", { "props": false }] */
      parsedMetadata.sections.forEach((section) => {
        section.parameters = buildParamsToRenderList(section.parameters, config);
      });
      insertReadmeTable(readmeFilePath, parsedMetadata.sections, config);
    }

    if (schemaFilePath) {
      parsedMetadata.parameters = buildParamsToRenderList(parsedMetadata.parameters, config);
      renderOpenAPISchema(schemaFilePath, parsedMetadata.parameters, config);
    }
  }
}

