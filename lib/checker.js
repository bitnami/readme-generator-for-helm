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

  console.log("INFO: Checking missing metadata...");
  missingKeys.forEach((key) => {
    errors.push(`ERROR: Missing metadata for key: ${key}`);
  });
  notFoundKeys.forEach((key) => {
    errors.push(`ERROR: Metadata provided for non existing key: ${key}`);
  });

  if (errors.length > 0) {
    console.log('\n\n######\nThe following errors must be fixed before proceeding\n######\n\n');
    errors.map((error) => console.log(error));
    throw new Error("ERROR: Wrong metadata!");
  } else {
    console.log("INFO: Metadata is correct!");
  }
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
 * Filter sections and objects annotated with @skip
 */
function filterValues(valuesObject, valuesMetadata) {
  // Filter sections from parsed values
  const fullMetadataValues = valuesMetadata.filter((el) => el.section ? false : true);
  const valuesPathToSkip = [];
  for (let v of fullMetadataValues) {
    if (v.skip) {
      valuesPathToSkip.push(v.skip); // save the value path to skip
    }
  }

  // Also skip values child of element with modifiers applied
  for (let value of fullMetadataValues) {
    if (value.modifier) {
      // A modifier was specified, add to the list to skip verification for the childs
      valuesPathToSkip.push(value.name);
    }
  }

  // The names of the values will have the full path to it
  // Save values not in the skip list or childs of a value from the skip list
  const metadataValuesToCheck = [];
   for (let v of fullMetadataValues) {
    if (v.name && !valuesPathToSkip.includes(v.name)) {
      metadataValuesToCheck.push(v);
    }
  }

  // Same for the real values
  const objectValuesToCheck = [];
  for (let v of valuesObject) {
    let skipValue = false;
    for (skipKey of valuesPathToSkip) {
      if (v.name.startsWith(skipKey)) {
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

module.exports = {
  checkKeys,
};
