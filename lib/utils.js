/*
* Copyright Broadcom, Inc. All Rights Reserved.
* SPDX-License-Identifier: Apache-2.0
*/

/*
 * Returns an array prefix in a dot notation path
 * Example:
 *  - a.b[0] -> a.b
 *  - a.b; a.b[0].c[0] -> a.b[0].c
 */
export function getArrayPrefix(array) {
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
export function sanitizeProperty(property) {
  const splitted = property.split('[');
  if (splitted.length > 1) {
    return getArrayPrefix(property);
  }
  return property;
}

/*
 * Check if the specifier modifier in on the modifiers list of the parameter
 */
export function containsModifier(parameter, modifier) {
  return !!parameter.modifiers.find((m) => m === modifier);
}

/*
 * Returns the value when the keys contain complex strings that cannot
 * be indexed with a dot notation.
 * Returned array path is compatible with lodash format.
 */
export function getArrayPath(obj, path, index = 0) {
  let fullPath = [];
  if (path !== '' && obj !== undefined) {
    if (Array.isArray(obj)) {
      // If we are accesing to an array element we will return the index number.
      fullPath.push(index);
      fullPath = fullPath.concat(getArrayPath(obj[index], path));
    } else {
      Object.keys(obj).forEach((key) => {
        if (path === key) {
          // We are the tail of the tree
          fullPath.push(key);
        } else {
          // We are defining a capturing group to get the index number
          // if we are accesing to a particular array element
          const keyRegex = new RegExp(`^${key}(?:\\[(\\d+)\\])*\\.`);
          const subKeys = path.split(keyRegex);
          if (subKeys.length > 1 && path.startsWith(key)) {
            // The key matches the path
            fullPath.push(key);
            // subKeys[1] contains the array index
            // subKeys[2] contains the rest of the path (removing key we've just found)
            fullPath = fullPath.concat(getArrayPath(obj[key], subKeys[2], subKeys[1]));
          }
        }
      });
    }
  }
  return fullPath;
}
