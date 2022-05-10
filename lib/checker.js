/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */

const { cloneDeep } = require('lodash');
const utils = require('./utils');

/*
 * Filter sections and objects
 * @skip entries will skip its verification and all the childrens
 * @extra entries will skip only its own verification
 */
function filterValues(valuesObject, valuesMetadata) {
  const fullMetadataValues = cloneDeep(valuesMetadata);
  // Get the values for which we will skip the check
  const valuesToSkip = fullMetadataValues.filter((v) => v.skip || v.modifiers.length > 0);
  const valuesPathToSkip = valuesToSkip.map((v) => {
    let name;
    if (v.skip) {
      name = v.name;
    }
    if (v.modifiers.length > 0) {
      // Skip validation when there are modifiers to avoid check sub-object
      name = utils.sanitizeProperty(v.name);
    }
    return name;
  });
  // Save values that not appear in the skip list or childs of a value from the skip list
  const metadataValuesToCheck = fullMetadataValues.filter(
    (v) => v.name && !valuesPathToSkip.includes(v.name) && !v.extra,
  );

  // Same for the real values
  const objectValuesToCheck = [];
  for (const v of valuesObject) {
    let skipValue = false;
    for (const skipKey of valuesPathToSkip) {
      // If it is equal it will be a simple property with a modifier
      // If it starts with '${skipKey}.' the property is an object
      // If it starts with '${skipKey}[' the property is an array
      if (v.name === skipKey || v.name.startsWith(`${skipKey}.`) || v.name.startsWith(`${skipKey}[`)) {
        console.log(`Skipping check for ${v.name}`);
        skipValue = true;
      }
    }
    if (!skipValue) {
      objectValuesToCheck.push(v);
    }
  }

  return [objectValuesToCheck, metadataValuesToCheck];
}

function getValuesToCheck(valuesObject, valuesMetadata) {
  const valuesToCheck = filterValues(valuesObject, valuesMetadata);
  const filteredValues = valuesToCheck[0];
  const filteredMetadata = valuesToCheck[1];
  // Return only the values paths
  const realKeys = filteredValues.map((el) => el.name);
  const parsedKeys = filteredMetadata.map((el) => el.name);
  return [realKeys, parsedKeys];
}

/*
 * Checks the keys are consistent between both inputs arrays
 * Params:
 *   - realKeys: Array with the real YAML keys
 *   - parsedKeys: Array with the keys to check against the real ones
 */
function checkKeys(valuesObject, valuesMetadata) {
  const valuesToCheck = getValuesToCheck(valuesObject, valuesMetadata);
  const realKeys = valuesToCheck[0];
  const parsedKeys = valuesToCheck[1];

  const errors = []; // Stores all the errors
  const missingKeys = realKeys.filter((key) => !parsedKeys.includes(key));
  const notFoundKeys = parsedKeys.filter((key) => !realKeys.includes(key));
  console.log('INFO: Checking missing metadata...');
  missingKeys.forEach((key) => {
    errors.push(`ERROR: Missing metadata for key: ${key}`);
  });
  notFoundKeys.forEach((key) => {
    errors.push(`ERROR: Metadata provided for non existing key: ${key}`);
  });

  if (errors.length > 0) {
    console.log('\n\n######\nThe following errors must be fixed before proceeding\n######\n\n');
    errors.map((error) => console.log(error));
    throw new Error('ERROR: Wrong metadata!');
  } else {
    console.log('INFO: Metadata is correct!');
  }
}

module.exports = {
  checkKeys,
};
