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

module.exports = {
  getArrayPrefix,
  sanitizeProperty,
};
