/*
* Copyright 2021-2021 VMware, Inc.
* SPDX-License-Identifier: Apache-2.0
*/

/* eslint-disable no-restricted-syntax */

const { groupBy, cloneDeep } = require('lodash');

/*
 * Returns the proper value for the provided modifier
 */
function applyModifiers(modifier, config) {
  let value;
  switch (modifier) {
    case `${config.modifiers.array}`:
      value = '[]';
      break;
    case `${config.modifiers.object}`:
      value = '{}';
      break;
    case `${config.modifiers.string}`:
      value = '""';
      break;
    default:
      throw new Error(`Unknown modifier: ${modifier}`);
  }
  return value;
}

/* Transform the list of Parameters into an object whose keys are the section names and
*  their values are the array of parameters for the section
*  Example:
*  {
*    "section1": [{...}, {...}],
*    "section2": [{...}, {...}]
*  }
*/
function buildSectionsArrays(parameters) {
  return groupBy(parameters, 'section');
}

/*
* Returns the array of Parameters after combining the information from the actual YAML with
* the parsed from the comments:
* Params:
*   - valuesObject: object with the real values built from the YAML.
*   - valuesMetadata: full metadata object parsed from comments
* Returns: array of Parameters with all the needed information about them
* IMPORTANT: the array returned will have fields that should not be rendered on the README and
*            fields that should not be rendered in the schema. They will be selected later.
*/
function combineMetadataAndValues(valuesObject, valuesMetadata) {
  for (const param of valuesMetadata) {
    // The parameters with extra do not appear in the actual object and don't have a value
    if (!param.extra) {
      const paramIndex = valuesObject.findIndex((e) => e.name === param.name);
      if (paramIndex !== -1) {
        // Set the value from actual object
        param.value = valuesObject[paramIndex].value;
        param.type = valuesObject[paramIndex].type;
      }
    }
  }

  // Add missing parameters to the metadata.
  // For example, the skip parameters are not parsed from metadata but must be in the array
  // to be rendered in the OpenAPI schema
  for (const param of valuesObject) {
    let paramIndex = valuesMetadata.findIndex((e) => e.name === param.name);
    if (paramIndex === -1) {
      // Find the position of the skip parameter
      paramIndex = valuesObject.findIndex((e) => e.name.startsWith(param.name));
      param.skip = true; // Avoid to render it on the READMEs
      param.schema = true;
      // Push the parameter after the skip object
      valuesMetadata.splice(paramIndex + 1, 0, param);
    }
  }
}

/*
* Returns the Parameter list that will be rendered in the README
*/
function buildParamsToRenderList(parametersList, config) {
  let returnList = cloneDeep(parametersList);
  for (const param of returnList) {
    if (param.modifier) {
      param.value = applyModifiers(param.modifier, config);
    }
    // The skip parameters must not be rendered in the README
    returnList = returnList.filter((p) => (!p.skip));
  }

  return returnList;
}

module.exports = {
  buildSectionsArrays,
  combineMetadataAndValues,
  buildParamsToRenderList,
};
