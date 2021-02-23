/*
 * Checks the keys are consistend between both inputs arrays
 * Params:
 *   - realKeys: Array with the real YAML keys
 *   - keysToCheck: Array with the keys to check against the real ones
 */
function checkKeys(realKeys, keysToCheck) {
  const errors = []; // Stores all the errors 
  const missingKeys = realKeys.filter((key) => !keysToCheck.includes(key));
  const notFoundKeys = keysToCheck.filter((key) => !realKeys.includes(key));

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

module.exports = {
  checkKeys,
};
