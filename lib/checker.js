/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

/*
 * Returns a property name, and in case it is an array the base of the array name without the index
 * Example:
 *  someArray[0] -> someArray
 *  someValue -> someValue
 */
function sanitizeProperty(property) {
  return property.split('[')[0];
}

/*
 * Filter sections and objects annotated with @skip
 */
function filterValues(valuesObject, valuesMetadata) {
  /* eslint-disable no-restricted-syntax */
  // Filter sections from parsed values
  const fullMetadataValues = valuesMetadata.filter((el) => (!el.section));
  // Get the values for which we will skip the check
  const valuesToSkip = fullMetadataValues.filter((v) => v.skip || v.modifier);
  const valuesPathToSkip = valuesToSkip.map((v) => {
    let name;
    if (v.skip) {
      name = v.skip;
    }
    if (v.modifier) {
      // Skip validation when there are modifiers to avoid check sub-object
      name = sanitizeProperty(v.name);
    }
    return name;
  });
  // Save values that not appear in the skip list or childs of a value from the skip list
  const metadataValuesToCheck = fullMetadataValues.filter(
    (v) => v.name && !valuesPathToSkip.includes(v.name),
  );

  // Same for the real values
  const objectValuesToCheck = [];
  for (const v of valuesObject) {
    let skipValue = false;
    if (v.isPlainArray) {
      // Skip check of plain array properties. They will be like array[3] with a string value
      skipValue = true;
      // Push instead the default array name without the index as the name
      // TODO(miguelaeh): if the array length is higher than 1 this will push duplicated
      if (!valuesPathToSkip.includes(sanitizeProperty(v.name))) {
        objectValuesToCheck.push({ name: sanitizeProperty(v.name), value: v.value });
      }
    }
    for (const skipKey of valuesPathToSkip) {
      // If it is equal it will be a simple property with a modifier
      // If it starts with '${skipKey}.' the property is an object
      // If it starts with '${skipKey}[' the property is an array
      if (v.name === skipKey ||  v.name.startsWith(`${skipKey}.`) || v.name.startsWith(`${skipKey}[`)) {
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
 * Checks the keys are consistend between both inputs arrays
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
