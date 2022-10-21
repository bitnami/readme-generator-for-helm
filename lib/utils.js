/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

/*
 * Returns an array prefix in a dot notation path
 * Example:
 *  - a.b[0] -> a.b
 *  - a.b; a.b[0].c[0] -> a.b[0].c
 */
function getArrayPrefix(array) {
  const splittedArray = array.split('[');
  return splittedArray.slice(0, [splittedArray.length - 1]).join('[');
}

/*
 * Returns a dot notation sanitized property name
 * in case it is an array the base of the array name without the index
 * Example:
 *  someArray[0] -> someArray
 *  someArray[0].nested[0] -> someArray[0].nested
 *  someValue -> someValue
 */
function sanitizeProperty(property) {
  const splitted = property.split('[');
  if (splitted.length > 1) {
    return getArrayPrefix(property);
  }
  return property;
}

/*
 * Check if the specifier modifier in on the modifiers list of the parameter
 */
function containsModifier(parameter, modifier) {
  return !!parameter.modifiers.find((m) => m === modifier);
}

/*
 * Returns the value when the keys contain complex strings that cannot
 * be indexed with a dot notation
 */
function getArrayPath(obj, path) {
  let fullPath = [];
  Object.keys(obj).forEach((key) => {
    if (path === key) {
      // We are the tail of the tree
      fullPath.push(key);
    } else {
      const subKeys = path.split(`${key}.`);
      if (subKeys.length > 1 && path.startsWith(`${key}.`)) {
        // The key matches the path
        fullPath.push(key);
        fullPath = fullPath.concat(getArrayPath(obj[key], subKeys[1]));
      }
    }
  });
  return fullPath;
}

module.exports = {
  getArrayPrefix,
  sanitizeProperty,
  containsModifier,
  getArrayPath,
};
